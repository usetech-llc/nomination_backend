import RpiService from '../src/rpi-nomination-strategy/rpi-service';
import { expect } from 'chai';
import precalculatedRpis from './rpi-data';

const epsilon = 0.0000001;

function withinError(a: number, b: number, message: string = undefined) {
  expect(a).to.be.within(b - epsilon/2, b + epsilon/2, message);
}

describe('rpi-service', () => {
  it('calculating mean and standard deviation correctly', () => {
    const service = new RpiService(null, null);
    const { mean, stdDeviation } = service.meanAndStdDeviation([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(mean).to.equal(5);
    withinError(stdDeviation, Math.sqrt(11));
  });

  it('empty array means 0 mean and standard deviation', () => {
    const service = new RpiService(null, null);
    const { mean, stdDeviation } = service.meanAndStdDeviation([]);
    expect(mean).to.equal(0);
    expect(stdDeviation).to.equal(0);
  });

  it('rpi for ksi < 0.5 calculates correctly', () => {
    const service = new RpiService(null, null);
    const { rpi } = service.rpiQuality({mean: 11, stdDeviation: 10}, 0.2);
    
    withinError(rpi, 0.5);
  });

  it('rpi for ksi = 0.5 calculates correctly', () => {
    const service = new RpiService(null, null);
    const { rpi } = service.rpiQuality({mean: 11, stdDeviation: 10}, 0.5);
    
    withinError(rpi, 1.1);
  });

  it('rpi for ksi > 0.5 calculates correctly', () => {
    const service = new RpiService(null, null);
    const { rpi } = service.rpiQuality({mean: 100, stdDeviation: 10}, 0.8);
    
    withinError(rpi, 64);
  });

  it('ksi < 0 throws error', () => {
    const service = new RpiService(null, null);
    expect(() => service.rpiQuality({mean: 100, stdDeviation: 10}, -0.1)).to.throw();
  });

  it('ksi > 1 throws error', () => {
    const service = new RpiService(null, null);
    expect(() => service.rpiQuality({mean: 100, stdDeviation: 10}, 1.1)).to.throw();
  });

  it('precalculated rpi values match what RpiService calculates', () => {
    const service = new RpiService(null, null);

    precalculatedRpis.forEach(c => {
      const serviceRpis = c.input.map(input => service.rpiQuality(input, c.ksi).rpi);
      serviceRpis.forEach(rpi => expect(rpi).not.undefined);
      expect(serviceRpis.length).to.equal(c.rpis.length);
      serviceRpis.forEach((rpi, i) => withinError(rpi, c.rpis[i], `ksi: ${c.ksi}, input: ${JSON.stringify(c.input[i])}`));
    });
  });
});