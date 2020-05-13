const { BN } = require('bn.js');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('../config');
const ReadWriteLock = require('rwlock');

const PERBILL = new BN(1_000_000_000);
const STAKING = 'staking';

module.exports = class Substrate {
  constructor() {
    this.connected = false;
    this.listLock = new ReadWriteLock();
  }

  async init() {
    try {
      // Initialise the provider to connect to the node
      this.wsProvider = new WsProvider(config.wsEndpoint);

      // Create the API and wait until ready
      this.api = await ApiPromise.create({ 
        provider: this.wsProvider,
        types: {
          "Address": "AccountId",
          "LookupSource": "AccountId",
          "Weight": "u32"
        }
      });

      // Read chain ID to check connection
      const chain = await this.api.rpc.system.chain();
      if (chain.toString().length != 0) {
        this.connected = true;

        // Connected! Create validator best list
        await this.createValidatorList();

        // Subscribe to new blocks
        await this.handleBlocks();

      }
    } catch (e) {
      console.log("========== Connection problem", e);
      this.connected = false;
    }
  }

  /**
   * Handle new blocks. If staking transaction comes in, re-create validator list
   * 
   * TODO: Later optimization - Check if it is necessary to re-create the list by analysing the 
   *       staking transactions in the block
   */
  async handleBlocks() {
    await this.api.rpc.chain.subscribeNewHeads(async (header) => {
      if (header.number % 100 == 0) 
        console.log(`Chain is at block: #${header.number}`);

      const blockHash = await this.api.rpc.chain.getBlockHash(header.number);
      const block = await this.api.rpc.chain.getBlock(blockHash);

      const extrinsics = block['block']['extrinsics'];
      for (let i=0; i<extrinsics.length; i++) {
        const callIndex = extrinsics[i]._raw['method']['callIndex'];
        const c = await this.api.findCall(callIndex);
        //console.log("Module called: ", c.section);
        if (c.section == STAKING) {
          console.log(`A ${STAKING} transaction was called`);
          this.createValidatorList(); // do not await
        }
      }

    });
  }


  sort (validators) {
    const sortBy = 'rankOverall';
    const sortFromMax = true;

    return validators
      .sort((a, b) => sortFromMax
        ? a[sortBy] - b[sortBy]
        : b[sortBy] - a[sortBy]
      )
      .sort((a, b) => a.isFavorite === b.isFavorite
        ? 0
        : (a.isFavorite ? -1 : 1)
      );
  }

  async manageAccountInfo(address) {
    const accInfo = await this.getAccountInfo(address);

    if (this.checkIdentity(accInfo)) {
      return address;
    } else if (accInfo.identity.parent) {
      const parentInfo = await this.getAccountInfo(accInfo.identity.parent.toString());
      if (this.checkIdentity(parentInfo)) {
        return address;
      }
    }
    return null;
  }

  async getAccountInfo(address) {
    return await this.api.derive.accounts.info(address);
  }

  checkIdentity(value) {
    return value.identity.judgements && value.identity.judgements.length > 0
  }

  /**
   * Filter validators by judgements. Discard empty judgements
   * @param electedInfo
   * @return filtered validators
   */
  async filterValidators(electedInfo) {
    if (electedInfo && electedInfo.info.length) {
      const addresses = await Promise.all(
        electedInfo.info.map((validator) => this.manageAccountInfo(validator.accountId.toString()))
      );
      
      const electedInfoFiltered = electedInfo.info.filter(validator => addresses.find(address => address === validator.accountId.toString()));
      return electedInfoFiltered;
    }

    return null;
  }

  sortValidators (list) {
    return list
      .sort((a, b) => b.commissionPer - a.commissionPer)
      .map((info, index) => {
        info.rankComm = index + 1;
  
        return info;
      })
      .sort((a, b) => b.bondOther.cmp(a.bondOther))
      .map((info, index) => {
        info.rankBondOther = index + 1;
  
        return info;
      })
      .sort((a, b) => b.bondOwn.cmp(a.bondOwn))
      .map((info, index) => {
        info.rankBondOwn = index + 1;
  
        return info;
      })
      .sort((a, b) => b.bondTotal.cmp(a.bondTotal))
      .map((info, index) => {
        info.rankBondTotal = index + 1;
  
        return info;
      })
      .sort((a, b) => b.validatorPayment.cmp(a.validatorPayment))
      .map((info, index) => {
        info.rankPayment = index + 1;
  
        return info;
      })
      .sort((a, b) => a.rewardSplit.cmp(b.rewardSplit))
      .map((info, index) => {
        info.rankReward = index + 1;
  
        return info;
      })
      .sort((a, b) => {
        const cmp = b.rewardPayout.cmp(a.rewardPayout);
  
        return cmp !== 0
          ? cmp
          : a.rankReward === b.rankReward
            ? a.rankPayment === b.rankPayment
              ? b.rankBondTotal - a.rankBondTotal
              : b.rankPayment - a.rankPayment
            : b.rankReward - a.rankReward;
      })
      .map((info, index) => {
        info.rankOverall = index + 1;
  
        return info;
      });
  }

  extractInfo (amount = new BN(0), electedInfo, lastReward = new BN(1)) {
    const nominators = [];
    let totalStaked = new BN(0);
    const perValidatorReward = lastReward.divn(electedInfo.length);
    const validators = this.sortValidators(
      electedInfo.map(({ accountId, exposure: _exposure, validatorPrefs }) => {
        const exposure = _exposure || {
          total: createType(registry, 'Compact<Balance>'),
          own: createType(registry, 'Compact<Balance>'),
          others: createType(registry, 'Vec<IndividualExposure>')
        };
        const prefs = validatorPrefs || {
          commission: createType(registry, 'Compact<Perbill>')
        };
        const bondOwn = exposure.own.unwrap();
        const bondTotal = exposure.total.unwrap();
        const validatorPayment = prefs.validatorPayment
          ? prefs.validatorPayment.unwrap()
          : prefs.commission.unwrap().mul(perValidatorReward).div(PERBILL);
        const key = accountId.toString();
        const rewardSplit = perValidatorReward.sub(validatorPayment);
        const rewardPayout = rewardSplit.gtn(0)
          ? amount.mul(rewardSplit).div(amount.add(bondTotal))
          : new BN(0);
  
        totalStaked = totalStaked.add(bondTotal);
  
        return {
          accountId,
          bondOther: bondTotal.sub(bondOwn),
          bondOwn,
          bondShare: 0,
          bondTotal,
          isCommission: !!prefs.commission,
          key,
          commissionPer: ((prefs.commission.unwrap() || new BN(0)).toNumber() / 10_000_000),
          numNominators: exposure.others.length,
          rankBondOther: 0,
          rankBondOwn: 0,
          rankBondTotal: 0,
          rankComm: 0,
          rankOverall: 0,
          rankPayment: 0,
          rankReward: 0,
          rewardPayout,
          rewardSplit,
          validatorPayment
        };
      })
    );

    return validators;
  }

  /**
   * Get, sort and filter validators
   * @return filtered validators
   */
  async createValidatorList() {

    console.log("Creating validator list");

    const amount = new BN(1_000);
    const electedInfo = await this.api.derive.staking.electedInfo();
    const filteredElected = await this.filterValidators(electedInfo);
    console.log(`filteredElected has ${filteredElected.length} validators`);

    const activeEra = (await this.api.derive.session.indexes([])).activeEra;
    let lastEra = new BN(0);
    if (activeEra.gtn(0)) {
      lastEra = activeEra.subn(1);
    }
    console.log("lastEra = ", lastEra);

    const lastReward = await this.api.query.staking.erasValidatorReward([lastEra]);
    console.log("lastReward = ", lastReward);

    let sorted = [];
    if (filteredElected) {
      const validators = this.extractInfo(amount, filteredElected);
      sorted = this.sort(validators);
      console.log("sorted length: ", sorted.length);
    }

    // Lock the list and update it
    let self = this;
    this.listLock.readLock(function (release) {

      self.bestList = [];
      for (let i=0; i<sorted.length; i++) {
        if (i >= 16) break;

        self.bestList.push({
          accountId: sorted[i].accountId.toString(),
          bondOther: sorted[i].bondOther.toString(),
          bondOwn: sorted[i].bondOwn.toString(),
          bondShare: sorted[i].bondShare.toString(),
          bondTotal: sorted[i].bondTotal.toString(),
          isCommission: sorted[i].isCommission,
          key: sorted[i].key,
          commissionPer: sorted[i].commissionPer,
          numNominators: sorted[i].numNominators,
          rankBondOther: sorted[i].rankBondOther,
          rankBondOwn: sorted[i].rankBondOwn,
          rankBondTotal: sorted[i].rankBondTotal,
          rankComm: sorted[i].rankComm,
          rankOverall: sorted[i].rankOverall,
          rankPayment: sorted[i].rankPayment,
          rankReward: sorted[i].rankReward,
          rewardPayout: sorted[i].rewardPayout.toString(),
          rewardSplit: sorted[i].rewardSplit.toString(),
          validatorPayment: sorted[i].validatorPayment.toString()
        });
      }

      release();
    });
  }

  async isConnected() {

    // TOOD: Insert last check timestamp to limit requests to the node
    this.connected = false;
    try {
      const chain = await this.api.rpc.system.chain();
      if (chain.toString().length != 0)
        this.connected = true;
    } catch (e) {
      this.connected = false;
    }

    return this.connected;
  }


  getBestValidatorList() {
    // Lock and clone the list
    let listCopy = [];
    let self = this;
    this.listLock.readLock(function (release) {
      listCopy = JSON.parse(JSON.stringify(self.bestList));
      release();
    });
  
    return listCopy;
  }
};

