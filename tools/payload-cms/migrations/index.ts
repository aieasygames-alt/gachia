import * as characterData from './20261125_character_data';
import * as eventSchedule from './20261126_event_schedule';
export const migrations = [
  { name: '20261125_character_data', up: characterData.up, down: characterData.down },
  { name: '20261126_event_schedule', up: eventSchedule.up, down: eventSchedule.down },
];
