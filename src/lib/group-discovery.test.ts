import { describe, expect, it } from "vitest";
import { groupDiscoverySessions, isGroupDiscoverable, nextGroupSessionTime } from "./group-discovery";
import type { GroupRecord } from "@/server/groupFinder";
const now = new Date("2026-09-29T10:00:00Z"); // Tuesday 17:00 Thailand
const base: GroupRecord = {id:"group",name:"Group",description:null,updated_at:null};
const event = {id:"event",group_id:"group",court_id:null,venue_name:"Community court",starts_at:"2026-09-30T11:00:00Z",ends_at:"2026-09-30T13:00:00Z",notes:null};
describe("unified group discovery", () => {
  it("shows dated one-time sessions with their venue", () => {
    expect(groupDiscoverySessions({...base, group_events:[event]},now)).toEqual([{day:"",date:"2026-09-30",start_time:"18:00",end_time:"20:00",courts:{name:"Community court"}}]);
  });
  it("makes a finished one-time group reusable but inactive in discovery", () => {
    const finished = {...event, starts_at:"2026-09-28T11:00:00Z",ends_at:"2026-09-28T13:00:00Z"};
    expect(isGroupDiscoverable({...base,group_events:[finished]},now)).toBe(false);
    expect(isGroupDiscoverable({...base,group_events:[finished,event]},now)).toBe(true);
    expect(isGroupDiscoverable(base,now)).toBe(true);
  });
  it("orders upcoming dates and regular sessions chronologically in Thailand", () => {
    const group = {...base, group_events:[event],group_sessions:[{day:"tuesday",start_time:"19:00",end_time:"21:00"}]};
    expect(nextGroupSessionTime(group,now)).toBe(new Date("2026-09-29T12:00:00Z").getTime());
    expect(groupDiscoverySessions(group,now).map(s=>s.start_time)).toEqual(["19:00","18:00"]);
  });
  it("puts a tomorrow one-time event before a later weekly slot", () => {
    const friday = new Date("2026-10-02T05:00:00Z");
    const tomorrow = {...event,starts_at:"2026-10-03T03:00:00Z",ends_at:"2026-10-03T05:00:00Z"};
    const group = {...base,group_events:[tomorrow],group_sessions:[{day:"monday",start_time:"19:00",end_time:"21:00"}]};
    expect(groupDiscoverySessions(group,friday)[0]).toMatchObject({date:"2026-10-03",start_time:"10:00"});
  });
  it("keeps an ongoing session and advances finished regular play to next week", () => {
    expect(nextGroupSessionTime({...base,group_sessions:[{day:"tuesday",start_time:"16:00",end_time:"18:00"}]},now)).toBe(new Date("2026-09-29T09:00:00Z").getTime());
    expect(nextGroupSessionTime({...base,group_sessions:[{day:"tuesday",start_time:"14:00",end_time:"16:00"}]},now)).toBe(new Date("2026-10-06T07:00:00Z").getTime());
  });
});
