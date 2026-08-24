import {env,exports} from "cloudflare:workers";
import {applyD1Migrations,type D1Migration} from "cloudflare:test";
import {beforeAll,describe,expect,it} from "vitest";
beforeAll(async()=>{await applyD1Migrations(env.DB,(env as Env&{TEST_MIGRATIONS:D1Migration[]}).TEST_MIGRATIONS)});
describe("research and learning platform",()=>{
 it("serves only published normalized research with real statistics",async()=>{const now="2026-08-22T12:00:00.000Z";await env.DB.batch([
  env.DB.prepare("INSERT INTO research_works(id,title,slug,abstract,research_status,workflow_status,publish_date) VALUES('11111111-1111-4111-8111-111111111111','Smart Agriculture IoT','smart-agriculture-iot','Reviewed abstract','PUBLISHED','PUBLISHED',?)").bind(now),
  env.DB.prepare("INSERT INTO research_works(id,title,slug,research_status,workflow_status) VALUES('22222222-2222-4222-8222-222222222222','Private Draft','private-draft','ONGOING','DRAFT')"),
  env.DB.prepare("INSERT INTO researchers(id,name,role,institution) VALUES('33333333-3333-4333-8333-333333333333','RUET Researcher','Lead','RUET')"),
  env.DB.prepare("INSERT INTO research_authors(research_id,researcher_id,author_order) VALUES('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',0)"),
 ]);const response=await exports.default.fetch("https://test.invalid/api/v1/research");const body=await response.json<any>();expect(response.status).toBe(200);expect(body.data.items).toHaveLength(1);expect(body.data.stats).toMatchObject({total:1,published:1,researchers:1});expect(JSON.stringify(body)).not.toContain("Private Draft")});
 it("returns published modules, lessons, and mixed lesson content",async()=>{const now="2026-08-22T12:00:00.000Z";await env.DB.batch([
  env.DB.prepare("INSERT INTO website_content_items(id,collection_key,data_json,status,published_at) VALUES('44444444-4444-4444-8444-444444444444','courses','{\"title\":\"IoT Foundations\"}','PUBLISHED',?)").bind(now),
  env.DB.prepare("INSERT INTO learning_courses(id,title,course_type,price_minor,currency,status,published_at) VALUES('44444444-4444-4444-8444-444444444444','IoT Foundations','FREE',0,'BDT','PUBLISHED',?)").bind(now),
  env.DB.prepare("INSERT INTO course_modules(id,course_id,title,sort_order,status) VALUES('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','Module One',1,'PUBLISHED')"),
  env.DB.prepare("INSERT INTO course_lessons(id,course_id,module_id,title,sort_order,status) VALUES('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','Lesson One',1,'PUBLISHED')"),
  env.DB.prepare("INSERT INTO lesson_contents(id,lesson_id,content_type,title,url,sort_order,status) VALUES('77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666','YOUTUBE','Lecture','https://www.youtube.com/watch?v=test',1,'PUBLISHED')"),
 ]);const response=await exports.default.fetch("https://test.invalid/api/v1/courses/44444444-4444-4444-8444-444444444444");const body=await response.json<any>();expect(response.status).toBe(200);expect(body.data.modules[0].lessons[0].contents[0]).toMatchObject({content_type:"YOUTUBE",title:"Lecture"})});
 it("removes archived lessons from the public curriculum",async()=>{await env.DB.prepare("UPDATE course_lessons SET archived_at='2026-08-22T13:00:00.000Z' WHERE id='66666666-6666-4666-8666-666666666666'").run();const response=await exports.default.fetch("https://test.invalid/api/v1/courses/44444444-4444-4444-8444-444444444444");const body=await response.json<any>();expect(response.status).toBe(200);expect(body.data.modules[0].lessons).toEqual([])});
 it("enforces event capacity in D1",async()=>{const now="2026-08-22T12:00:00.000Z";await env.DB.batch([
  env.DB.prepare("INSERT INTO users(id,primary_email,primary_email_normalized,display_name,status) VALUES('88888888-8888-4888-8888-888888888881','one@example.com','one@example.com','User One','EMAIL_VERIFIED')"),
  env.DB.prepare("INSERT INTO users(id,primary_email,primary_email_normalized,display_name,status) VALUES('88888888-8888-4888-8888-888888888882','two@example.com','two@example.com','User Two','EMAIL_VERIFIED')"),
  env.DB.prepare("INSERT INTO website_content_items(id,collection_key,data_json,status,published_at) VALUES('99999999-9999-4999-8999-999999999999','events','{\"title\":\"Capacity Test\",\"max_participants\":1}','PUBLISHED',?)").bind(now),
  env.DB.prepare("INSERT INTO event_registrations(id,event_id,user_id,participant_name,email,event_type,fee_minor,currency,payment_status,registration_status) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888881','User One','one@example.com','FREE',0,'BDT','NOT_REQUIRED','APPROVED')"),
 ]);await expect(env.DB.prepare("INSERT INTO event_registrations(id,event_id,user_id,participant_name,email,event_type,fee_minor,currency,payment_status,registration_status) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888882','User Two','two@example.com','FREE',0,'BDT','NOT_REQUIRED','APPROVED')").run()).rejects.toThrow(/capacity reached/u)});
});
