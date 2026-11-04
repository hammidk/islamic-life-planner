import { describe, expect, it } from 'vitest';
import { normalize } from '../utils/userData';

describe('поле prayerId', () => {
  it('старые дела без prayerId читаются как есть, неизвестный намаз отбрасывается', () => {
    const snap = normalize({
      tasks: [
      { id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' },
      { id: 'b', title: 'Азкары', sphere: 'faith', period: 'untilDhuhr', status: 'open', prayerId: 'fajr' },
      { id: 'c', title: 'Мусор', sphere: 'faith', period: 'untilDhuhr', status: 'open', prayerId: 'lunch' }]

    })!;
    expect(snap.tasks[0]).toEqual({ id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' });
    expect(snap.tasks[1].prayerId).toBe('fajr');
    expect('prayerId' in snap.tasks[2]).toBe(false);
  });
});
