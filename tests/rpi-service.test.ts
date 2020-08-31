import RpiService from '../src/rpi-nomination-strategy/rpi-service';
import { expect } from 'chai';

const epsilon = 0.0000001;

function withinError(a: number, b: number) {
  expect(a).to.be.within(b - epsilon/2, b + epsilon/2);
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
});