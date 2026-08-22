import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarDays, Copy, Eye, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  LoadingState,
  StatusBadge,
  adminButton,
  adminInput,
  adminSecondaryButton,
} from "./AdminUI";
import { HeroImageField } from "./HeroImageField";
import RichTextEditor from "./RichTextEditor";

export type CommunityKind = "events" | "people" | "partners" | "opportunities";
type FieldType = "text" | "textarea" | "richtext" | "media" | "gallerymedia" | "number" | "checkbox" | "select" | "datetime" | "date" | "tags" | "url" | "email";
interface Field { key: string; label: string; type?: FieldType; required?: boolean; options?: string[]; wide?: boolean; help?: string; }
interface Group { title: string; description?: string; fields: Field[]; }
interface Definition {
  singular: string;
  title: string;
  description: string;
  nameKey: string;
  subtitleKey: string;
  defaults: Record<string, unknown>;
  groups: Group[];
}

const workflow = ["DRAFT", "PUBLISHED"] as const;
const eventTypes = ["Workshop","Seminar","Hackathon","Competition","Training","Conference","Meetup","Webinar","Exhibition","Other"];
const personTypes = ["EXECUTIVE","ADVISORY_BOARD","FACULTY_ADVISOR","GENERAL_MEMBER","VOLUNTEER","ALUMNI","MENTOR","RESEARCHER","COORDINATOR","FORMER_EXECUTIVE"];
const partnerCategories = ["Local NGO","National NGO","International NGO","Government Organization","Government Agency","Educational Institution","University","Research Institution","Corporate","Technology Company","Startup","Industry Partner","International Organization","Development Organization","Media Partner","Community Organization","Other"];
const opportunityTypes = ["Scholarship","Internship","Fellowship","Competition","Workshop","Training","Volunteer Opportunity","Research Opportunity","Job","Campus Opportunity","Grant","Call for Applications","Other"];
const eventDefaults = () => {
  const start = new Date(Date.now() + 86400000); const end = new Date(start.getTime() + 7200000);
  return { slug:"",title:"",shortDescription:"",fullDescription:"",eventType:"Workshop",category:"Workshop",eventStatus:"SCHEDULED",featured:false,sortOrder:0,startsAt:start.toISOString(),endsAt:end.toISOString(),timezone:"Asia/Dhaka",locationType:"PHYSICAL",venue:"",address:"",city:"Rajshahi",country:"Bangladesh",latitude:null,longitude:null,onlineUrl:"",onlinePlatform:"",meetingInstructions:"",mapUrl:"",coverImageUrl:"",thumbnailUrl:"",gallery:[],posterUrl:"",videoUrl:"",registrationRequired:true,registrationMode:"INTERNAL",registrationUrl:"",registrationDeadline:"",maxParticipants:0,registrationCapacityOverride:false,feeMinor:0,currency:"BDT",paymentRequired:false,paymentMethods:["BKASH"],bkashNumber:"01580352238",registrationStatus:"OPEN",organizer:"RUET IoT Club",organizerPersonId:null,coOrganizers:[],coOrganizerIds:[],partners:[],partnerIds:[],sponsors:[],sponsorIds:[],speakers:[],speakerIds:[],trainers:[],trainerIds:[],tags:[],targetAudience:"",eligibility:"",certificateAvailable:false,certificateRequireRegistration:true,certificateRequirePayment:true,certificateRequireAttendance:true,certificateMinAttendancePercent:100,contactEmail:"ruetiotclub@gmail.com",contactPhone:"",seoTitle:"",metaDescription:"",ogImageUrl:"",canonicalUrl:"",workflowStatus:"DRAFT" };
};

const definitions: Record<CommunityKind, Definition> = {
  events: {
    singular:"event", title:"Event Management", nameKey:"title", subtitleKey:"startsAt",
    description:"Create complete event profiles, control registration, and publish one canonical record to the public Events experience.",
    defaults:eventDefaults(),
    groups:[
      {title:"1. Basic information",fields:[
        {key:"title",label:"Event title",required:true,wide:true},{key:"slug",label:"Slug",required:true},{key:"eventType",label:"Event type",type:"select",options:eventTypes,required:true},{key:"category",label:"Category",required:true},{key:"eventStatus",label:"Operational status",type:"select",options:["SCHEDULED","ONGOING","COMPLETED","CANCELLED","POSTPONED"]},{key:"shortDescription",label:"Short description",type:"textarea",required:true,wide:true},{key:"fullDescription",label:"Full description",type:"richtext",required:true,wide:true},{key:"featured",label:"Featured event",type:"checkbox"},{key:"sortOrder",label:"Display order",type:"number"}]},
      {title:"2. Schedule and location",fields:[
        {key:"startsAt",label:"Starts",type:"datetime",required:true},{key:"endsAt",label:"Ends",type:"datetime",required:true},{key:"timezone",label:"Timezone",required:true},{key:"locationType",label:"Location type",type:"select",options:["PHYSICAL","ONLINE","HYBRID"]},{key:"venue",label:"Venue"},{key:"address",label:"Address",wide:true},{key:"city",label:"City"},{key:"country",label:"Country"},{key:"latitude",label:"Latitude",type:"number"},{key:"longitude",label:"Longitude",type:"number"},{key:"onlinePlatform",label:"Online platform"},{key:"onlineUrl",label:"Online meeting URL",type:"url"},{key:"meetingInstructions",label:"Meeting instructions",type:"textarea",wide:true},{key:"mapUrl",label:"Google Maps embed URL",type:"url",wide:true}]},
      {title:"3. Media",description:"Use URLs generated by the Media Library so assets remain in Cloudflare R2.",fields:[
        {key:"coverImageUrl",label:"Cover image",type:"media",wide:true},{key:"thumbnailUrl",label:"Thumbnail",type:"media",wide:true},{key:"posterUrl",label:"Promotional poster",type:"media",wide:true},{key:"gallery",label:"Gallery images",type:"gallerymedia",wide:true,help:"Choose multiple R2 assets and reorder them for the public page."},{key:"videoUrl",label:"Video URL",type:"url",wide:true}]},
      {title:"4. Registration and payment",fields:[
        {key:"registrationRequired",label:"Registration required",type:"checkbox"},{key:"registrationMode",label:"Registration mode",type:"select",options:["INTERNAL","EXTERNAL","CLOSED"]},{key:"registrationStatus",label:"Registration status",type:"select",options:["UPCOMING","OPEN","CLOSED","FULL"]},{key:"registrationUrl",label:"External registration URL",type:"url"},{key:"registrationDeadline",label:"Registration deadline",type:"datetime"},{key:"maxParticipants",label:"Maximum participants (0 = unlimited)",type:"number"},{key:"registrationCapacityOverride",label:"Override automatic capacity closing",type:"checkbox"},{key:"paymentRequired",label:"Payment required",type:"checkbox"},{key:"feeMinor",label:"Fee in minor units (৳500 = 50000)",type:"number"},{key:"currency",label:"Currency"},{key:"bkashNumber",label:"bKash payment number",help:"Production default: 01580352238"}]},
      {title:"5. Organizers and audience",fields:[
        {key:"organizer",label:"Organizer",required:true},{key:"coOrganizers",label:"Co-organizers",type:"tags"},{key:"partners",label:"Partners",type:"tags"},{key:"sponsors",label:"Sponsors",type:"tags"},{key:"speakers",label:"Speakers",type:"tags"},{key:"trainers",label:"Trainers",type:"tags"},{key:"tags",label:"Tags",type:"tags"},{key:"targetAudience",label:"Target audience",type:"textarea",wide:true},{key:"eligibility",label:"Eligibility",type:"textarea",wide:true},{key:"contactEmail",label:"Contact email",type:"email"},{key:"contactPhone",label:"Contact phone"}]},
      {title:"6. Event certificate",fields:[
        {key:"certificateAvailable",label:"Certificate available",type:"checkbox"},{key:"certificateRequireRegistration",label:"Require approved registration",type:"checkbox"},{key:"certificateRequirePayment",label:"Require verified payment for paid event",type:"checkbox"},{key:"certificateRequireAttendance",label:"Require present attendance",type:"checkbox"},{key:"certificateMinAttendancePercent",label:"Minimum attendance percent",type:"number"}]},
      {title:"7. SEO and publication",fields:[
        {key:"seoTitle",label:"SEO title"},{key:"metaDescription",label:"Meta description",type:"textarea",wide:true},{key:"ogImageUrl",label:"Open Graph image",type:"media",wide:true},{key:"canonicalUrl",label:"Canonical URL",type:"url"},{key:"workflowStatus",label:"Publication status",type:"select",options:[...workflow]}]},
    ],
  },
  people: {
    singular:"person",title:"People Management",nameKey:"fullName",subtitleKey:"position",
    description:"Manage the public team, advisors, members, volunteers, alumni, mentors, and researchers with appropriate privacy controls.",
    defaults:{slug:"",fullName:"",profilePhotoUrl:"",shortBio:"",biography:"",publicEmail:"",publicPhone:"",series:"",department:"",university:"Rajshahi University of Engineering & Technology",studentIdPrivate:"",graduationYear:null,personType:"GENERAL_MEMBER",position:"Member",term:"",committeeSession:"",startsOn:"",endsOn:"",currentPosition:true,sortOrder:0,featured:false,publicProfile:true,linkedinUrl:"",githubUrl:"",facebookUrl:"",websiteUrl:"",researchProfileUrl:"",workflowStatus:"DRAFT"},
    groups:[
      {title:"1. Identity",fields:[{key:"fullName",label:"Full name",required:true},{key:"slug",label:"Slug",required:true},{key:"profilePhotoUrl",label:"Profile photo URL",type:"url",wide:true},{key:"shortBio",label:"Short bio",type:"textarea",wide:true},{key:"biography",label:"Full biography",type:"textarea",wide:true},{key:"publicEmail",label:"Public email",type:"email"},{key:"publicPhone",label:"Public phone"}]},
      {title:"2. Academic information",fields:[{key:"series",label:"Series / batch"},{key:"department",label:"Department"},{key:"university",label:"University",wide:true},{key:"studentIdPrivate",label:"Student ID (private)"},{key:"graduationYear",label:"Graduation year",type:"number"}]},
      {title:"3. Club role and term",fields:[{key:"personType",label:"Person type",type:"select",options:personTypes},{key:"position",label:"Position",required:true},{key:"term",label:"Term"},{key:"committeeSession",label:"Committee / session"},{key:"startsOn",label:"Start date",type:"date"},{key:"endsOn",label:"End date",type:"date"},{key:"currentPosition",label:"Current position",type:"checkbox"},{key:"featured",label:"Featured",type:"checkbox"},{key:"publicProfile",label:"Show public profile",type:"checkbox"},{key:"sortOrder",label:"Display order",type:"number"}]},
      {title:"4. Social and publication",fields:[{key:"linkedinUrl",label:"LinkedIn",type:"url"},{key:"githubUrl",label:"GitHub",type:"url"},{key:"facebookUrl",label:"Facebook",type:"url"},{key:"websiteUrl",label:"Personal website",type:"url"},{key:"researchProfileUrl",label:"Research profile",type:"url"},{key:"workflowStatus",label:"Publication status",type:"select",options:[...workflow]}]},
    ],
  },
  partners: {
    singular:"partner",title:"Published Partner Management",nameKey:"organizationName",subtitleKey:"category",
    description:"Manage officially approved public partners separately from incoming partnership applications.",
    defaults:{slug:"",organizationName:"",logoUrl:"",coverImageUrl:"",shortDescription:"",fullDescription:"",category:"Other",country:"Bangladesh",city:"",websiteUrl:"",contactEmail:"",contactPerson:"",partnershipType:"",startsOn:"",endsOn:"",active:true,featured:false,sortOrder:0,facebookUrl:"",linkedinUrl:"",instagramUrl:"",otherUrl:"",seoTitle:"",metaDescription:"",workflowStatus:"DRAFT",sourceSubmissionId:null},
    groups:[
      {title:"1. Organization",fields:[{key:"organizationName",label:"Organization name",required:true},{key:"slug",label:"Slug",required:true},{key:"category",label:"Partner category",type:"select",options:partnerCategories},{key:"country",label:"Country"},{key:"city",label:"City"},{key:"websiteUrl",label:"Website",type:"url"},{key:"contactPerson",label:"Contact person"},{key:"contactEmail",label:"Contact email",type:"email"},{key:"shortDescription",label:"Short description",type:"textarea",wide:true,required:true},{key:"fullDescription",label:"Full description",type:"textarea",wide:true,required:true}]},
      {title:"2. Partnership",fields:[{key:"partnershipType",label:"Partnership type"},{key:"startsOn",label:"Start date",type:"date"},{key:"endsOn",label:"End date",type:"date"},{key:"active",label:"Active partnership",type:"checkbox"},{key:"featured",label:"Featured partner",type:"checkbox"},{key:"sortOrder",label:"Display order",type:"number"}]},
      {title:"3. Media and social",description:"Choose Media Library assets and paste their R2-backed URLs.",fields:[{key:"logoUrl",label:"Logo URL",type:"url"},{key:"coverImageUrl",label:"Cover image URL",type:"url"},{key:"facebookUrl",label:"Facebook",type:"url"},{key:"linkedinUrl",label:"LinkedIn",type:"url"},{key:"instagramUrl",label:"Instagram",type:"url"},{key:"otherUrl",label:"Other URL",type:"url"}]},
      {title:"4. SEO and publication",fields:[{key:"seoTitle",label:"SEO title"},{key:"metaDescription",label:"Meta description",type:"textarea",wide:true},{key:"workflowStatus",label:"Publication status",type:"select",options:[...workflow]}]},
    ],
  },
  opportunities: {
    singular:"opportunity",title:"Opportunity Management",nameKey:"title",subtitleKey:"opportunityType",
    description:"Publish scholarships, internships, calls, competitions, grants, jobs, and RUET IoT Club opportunities.",
    defaults:{slug:"",title:"",shortDescription:"",fullDescription:"",category:"General",organization:"RUET IoT Club",opportunityType:"Other",featured:false,applicationOpensAt:null,applicationDeadline:null,startsAt:null,endsAt:null,eligibility:"",whoCanApply:"",academicLevel:"",department:"",series:"",location:"",ageRequirement:"",otherEligibility:"",applicationMode:"EXTERNAL",applicationUrl:"",contactEmail:"ruetiotclub@gmail.com",contactPhone:"",requiredDocuments:[],coverImageUrl:"",logoUrl:"",attachments:[],seoTitle:"",metaDescription:"",ogImageUrl:"",sortOrder:0,workflowStatus:"DRAFT"},
    groups:[
      {title:"1. Basic information",fields:[{key:"title",label:"Title",required:true},{key:"slug",label:"Slug",required:true},{key:"category",label:"Category",required:true},{key:"organization",label:"Organization",required:true},{key:"opportunityType",label:"Opportunity type",type:"select",options:opportunityTypes},{key:"featured",label:"Featured",type:"checkbox"},{key:"shortDescription",label:"Short description",type:"textarea",wide:true,required:true},{key:"fullDescription",label:"Full description",type:"textarea",wide:true,required:true}]},
      {title:"2. Timeline",fields:[{key:"applicationOpensAt",label:"Applications open",type:"datetime"},{key:"applicationDeadline",label:"Application deadline",type:"datetime"},{key:"startsAt",label:"Starts",type:"datetime"},{key:"endsAt",label:"Ends",type:"datetime"}]},
      {title:"3. Eligibility",fields:[{key:"whoCanApply",label:"Who can apply",type:"textarea",wide:true},{key:"eligibility",label:"Eligibility",type:"textarea",wide:true},{key:"academicLevel",label:"Academic level"},{key:"department",label:"Department"},{key:"series",label:"Series"},{key:"location",label:"Location"},{key:"ageRequirement",label:"Age requirement"},{key:"otherEligibility",label:"Other eligibility",type:"textarea",wide:true}]},
      {title:"4. Application",fields:[{key:"applicationMode",label:"Application mode",type:"select",options:["INTERNAL","EXTERNAL"]},{key:"applicationUrl",label:"Application URL",type:"url"},{key:"contactEmail",label:"Contact email",type:"email"},{key:"contactPhone",label:"Contact phone"},{key:"requiredDocuments",label:"Required documents",type:"tags",wide:true},{key:"attachments",label:"Attachment URLs",type:"tags",wide:true}]},
      {title:"5. Media, SEO, publication",fields:[{key:"coverImageUrl",label:"Cover image URL",type:"url"},{key:"logoUrl",label:"Organization logo URL",type:"url"},{key:"seoTitle",label:"SEO title"},{key:"metaDescription",label:"Meta description",type:"textarea",wide:true},{key:"ogImageUrl",label:"Open Graph image",type:"url"},{key:"sortOrder",label:"Display order",type:"number"},{key:"workflowStatus",label:"Publication status",type:"select",options:[...workflow]}]},
    ],
  },
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150);
const datetimeLocal = (value: unknown) => typeof value === "string" && value ? new Date(value).toISOString().slice(0,16) : "";
const clean = (value: Record<string,unknown>, groups: Group[]) => {
  const output={...value};
  for(const field of groups.flatMap((group)=>group.fields)){
    if(field.type==="number") output[field.key]=["latitude","longitude"].includes(field.key)&&([null,undefined,""] as unknown[]).includes(output[field.key])?null:Number(output[field.key]||0);
    if(field.type==="tags" && typeof output[field.key]==="string") output[field.key]=String(output[field.key]).split(/[\n,]/).map((item)=>item.trim()).filter(Boolean);
    if(field.type==="datetime") output[field.key]=output[field.key]?new Date(String(output[field.key])).toISOString():"";
    if(!["number","checkbox"].includes(field.type||"") && output[field.key]===null) output[field.key]="";
    if(["url","email","media"].includes(field.type||"") && output[field.key]==="") output[field.key]="";
  }
  return output;
};

export default function CommunityManagement({kind,permissions,csrfToken}:{kind:CommunityKind;permissions:string[];csrfToken?:string}){
  const definition=definitions[kind]; const [items,setItems]=useState<Record<string,unknown>[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [search,setSearch]=useState(""); const [status,setStatus]=useState(""); const [editor,setEditor]=useState<Record<string,unknown>|null>(null);
  const canManage=permissions.includes(`${kind==="events"?"event":kind==="people"?"people":kind==="partners"?"partner":"opportunity"}.manage`)||permissions.includes("content.manage");
  const resource=kind==="events"?"/admin/events":`/admin/community/${kind}`;
  const load=useCallback(async()=>{setLoading(true);try{setItems(await apiRequest<Record<string,unknown>[]>(resource));}catch(error){toast.error(error instanceof Error?error.message:`Unable to load ${kind}.`);}finally{setLoading(false);}},[kind,resource]);
  useEffect(()=>{void load();},[load]);
  const visible=useMemo(()=>items.filter((item)=>{const term=search.trim().toLowerCase();return(!status||item.workflowStatus===status)&&(!term||JSON.stringify(item).toLowerCase().includes(term));}),[items,search,status]);
  const openNew=()=>setEditor({id:crypto.randomUUID(),...definition.defaults});
  const update=(key:string,value:unknown)=>setEditor((current)=>current?{...current,[key]:value}:current);
  const save=async()=>{if(!editor||!csrfToken)return;const name=String(editor[definition.nameKey]||"").trim();if(!name)return toast.error(`${definition.singular} name is required.`);const payload={...editor};delete payload.id;if(!payload.slug)payload.slug=slugify(name);if(kind==="events"&&!payload.paymentRequired)payload.feeMinor=0;setBusy(true);try{await apiRequest(`${resource}/${encodeURIComponent(String(editor.id))}`,{method:"PUT",csrfToken,body:clean(payload,definition.groups)});toast.success(`${definition.singular[0].toUpperCase()+definition.singular.slice(1)} saved.`);setEditor(null);await load();}catch(error){toast.error(error instanceof Error?error.message:"Unable to save this record.");}finally{setBusy(false);}};
  const archive=async(item:Record<string,unknown>)=>{if(!csrfToken||!window.confirm(`Archive “${String(item[definition.nameKey])}”? It will leave the public website.`))return;setBusy(true);try{await apiRequest(`${resource}/${encodeURIComponent(String(item.id))}`,{method:"DELETE",csrfToken});toast.success("Record archived.");await load();}catch(error){toast.error(error instanceof Error?error.message:"Unable to archive this record.");}finally{setBusy(false);}};
  const duplicate=(item:Record<string,unknown>)=>{const copy={...item,id:crypto.randomUUID(),title:`${String(item.title||"")} copy`,slug:`${String(item.slug||"event")}-copy-${Date.now().toString().slice(-5)}`,workflowStatus:"DRAFT",featured:false};setEditor(copy);};
  return <div className="space-y-6">
    <AdminPageHeader title={definition.title} description={definition.description} actions={canManage?<button type="button" onClick={openNew} className={adminButton}><Plus size={16}/>Create {definition.singular}</button>:undefined}/>
    <AdminCard className="grid gap-3 p-4 md:grid-cols-[1fr_13rem]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><span className="sr-only">Search</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder={`Search ${kind}…`} className={`${adminInput} pl-9`}/></label><select value={status} onChange={(event)=>setStatus(event.target.value)} className={adminInput} aria-label="Publication status"><option value="">All publication states</option><option>DRAFT</option><option>PUBLISHED</option></select></AdminCard>
    {loading?<LoadingState label={`Loading ${kind}…`}/>:visible.length===0?<EmptyState title={`No ${kind} found`} description={`Create the first ${definition.singular} or adjust the current filters.`} action={canManage?<button onClick={openNew} className={adminButton}>Create {definition.singular}</button>:undefined}/>:<div className="grid gap-4 lg:grid-cols-2">{visible.map((item)=><AdminCard key={String(item.id)} className="p-5"><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap gap-2"><StatusBadge status={String(item.workflowStatus)}/>{Boolean(item.featured)&&<StatusBadge status="FEATURED"/>}{kind==="events"&&<StatusBadge status={String(item.eventStatus)}/>}</div><h3 className="truncate text-lg font-semibold">{String(item[definition.nameKey]||"Untitled")}</h3><p className="mt-1 text-sm text-muted-foreground">{kind==="events"?new Date(String(item[definition.subtitleKey])).toLocaleString():String(item[definition.subtitleKey]||"")}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{String(item.shortDescription||item.shortBio||"No summary provided.")}</p>{kind==="events"&&<p className="mt-3 text-xs text-muted-foreground">{Number(item.reservedCount||0)} registered · {item.remainingCapacity===null?"Unlimited capacity":`${item.remainingCapacity} spaces left`}</p>}</div>{canManage&&<div className="flex shrink-0 flex-wrap justify-end gap-2">{kind==="events"&&<><a aria-label="Preview" href={`/events/${String(item.slug)}`} target="_blank" rel="noreferrer" className={adminSecondaryButton}><Eye size={15}/></a><button type="button" aria-label="Duplicate" onClick={()=>duplicate(item)} className={adminSecondaryButton}><Copy size={15}/></button></>}<button type="button" aria-label="Edit" onClick={()=>setEditor({...item})} className={adminSecondaryButton}><Pencil size={15}/></button><button type="button" aria-label="Archive" disabled={busy} onClick={()=>void archive(item)} className={adminSecondaryButton}><Archive size={15}/></button></div>}</div></AdminCard>)}</div>}
    {editor&&<div className="fixed inset-0 z-[100] flex justify-end bg-black/75 backdrop-blur-sm"><form onSubmit={(event)=>{event.preventDefault();void save();}} className="h-full w-full max-w-4xl overflow-y-auto border-l border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))] shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 p-5 backdrop-blur-xl"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{items.some((item)=>item.id===editor.id)?"Edit":"Create"} {definition.singular}</p><h2 className="mt-1 text-xl font-semibold">{String(editor[definition.nameKey]||`New ${definition.singular}`)}</h2></div><button type="button" onClick={()=>setEditor(null)} aria-label="Close editor" className={adminSecondaryButton}><X size={16}/></button></header><div className="space-y-6 p-5">{definition.groups.map((group)=><AdminCard key={group.title} className="p-5"><h3 className="font-semibold">{group.title}</h3>{group.description&&<p className="mt-1 text-xs text-muted-foreground">{group.description}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2">{group.fields.map((field)=><FieldControl key={field.key} field={field} value={editor[field.key]} csrfToken={csrfToken} onChange={(value)=>{update(field.key,value);if(field.key===definition.nameKey&&!editor.slug)update("slug",slugify(String(value)));}}/>)}</div></AdminCard>)}{kind==="events"&&<AdminCard className="overflow-hidden"><p className="border-b border-[hsl(var(--admin-border))] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Live draft preview</p>{editor.coverImageUrl&&<img src={String(editor.coverImageUrl)} alt="" className="aspect-[16/6] w-full object-cover"/>}<div className="p-5"><div className="flex flex-wrap gap-2"><StatusBadge status={String(editor.eventStatus)}/><StatusBadge status={editor.paymentRequired?"PAID":"FREE"}/></div><h2 className="mt-4 text-3xl font-bold">{String(editor.title||"Untitled event")}</h2><p className="mt-3 text-muted-foreground">{String(editor.shortDescription||"Add a short description to preview the event.")}</p><div className="prose prose-invert mt-5 max-w-none" dangerouslySetInnerHTML={{__html:String(editor.fullDescription||"")}}/></div></AdminCard>}</div><footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-elevated))]/95 p-5 backdrop-blur-xl">{kind==="events"&&editor.workflowStatus==="PUBLISHED"&&editor.slug&&<a href={`/events/${String(editor.slug)}`} target="_blank" rel="noreferrer" className={adminSecondaryButton}><Eye size={15}/>Open public page</a>}<button type="button" onClick={()=>setEditor(null)} className={adminSecondaryButton}>Cancel</button><button type="submit" disabled={busy} className={adminButton}>{busy?"Saving…":editor.workflowStatus==="PUBLISHED"?"Save & publish":"Save draft"}</button></footer></form></div>}
  </div>;
}

function FieldControl({field,value,onChange,csrfToken}:{field:Field;value:unknown;onChange:(value:unknown)=>void;csrfToken?:string}){
  const wrapper=`${field.wide?"sm:col-span-2":""} text-sm font-medium`;
  if(field.type==="checkbox")return <label className={`${wrapper} flex min-h-12 items-center gap-3 rounded-xl border border-[hsl(var(--admin-border))] p-3`}><input type="checkbox" checked={Boolean(value)} onChange={(event)=>onChange(event.target.checked)} className="size-4 accent-cyan-400"/>{field.label}</label>;
  if(field.type==="richtext")return <div className={wrapper}><p className="mb-2">{field.label}{field.required&&<span className="text-red-300"> *</span>}</p><RichTextEditor value={String(value??"")} onChange={onChange}/></div>;
  if(field.type==="media"){
    const url=String(value??"");
    const key=url.startsWith("/api/v1/media/files/")?url.slice("/api/v1/media/files/".length):url;
    return <div className={wrapper}><HeroImageField value={url?{key,url,originalName:decodeURIComponent(url.split("/").pop()||"Selected media")}:null} altText={field.label} title={field.label} csrfToken={csrfToken} onChange={(media)=>onChange(media?.url||"")} onAltTextChange={()=>undefined} onUploadingChange={()=>undefined}/></div>;
  }
  if(field.type==="gallerymedia")return <GalleryMediaField className={wrapper} urls={Array.isArray(value)?value.map(String):[]} csrfToken={csrfToken} onChange={onChange}/>;
  const shown=field.type==="datetime"?datetimeLocal(value):field.type==="tags"&&Array.isArray(value)?value.join("\n"):String(value??"");
  if(field.type==="textarea"||field.type==="tags")return <label className={wrapper}>{field.label}{field.required&&<span className="text-red-300"> *</span>}<textarea required={field.required} rows={field.type==="tags"?3:5} value={shown} onChange={(event)=>onChange(event.target.value)} className={`${adminInput} mt-2 resize-y`}/>{field.help&&<span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>;
  if(field.type==="select")return <label className={wrapper}>{field.label}{field.required&&<span className="text-red-300"> *</span>}<select required={field.required} value={shown} onChange={(event)=>onChange(event.target.value)} className={`${adminInput} mt-2`}>{field.options?.map((option)=><option key={option} value={option}>{option.replace(/_/g," ")}</option>)}</select></label>;
  return <label className={wrapper}>{field.label}{field.required&&<span className="text-red-300"> *</span>}<input required={field.required} type={field.type==="datetime"?"datetime-local":field.type||"text"} min={field.type==="number"?"0":undefined} value={shown} onChange={(event)=>onChange(field.type==="number"?Number(event.target.value):event.target.value)} className={`${adminInput} mt-2`}/>{field.help&&<span className="mt-1 block text-xs font-normal text-muted-foreground">{field.help}</span>}</label>;
}

function GalleryMediaField({className,urls,csrfToken,onChange}:{className:string;urls:string[];csrfToken?:string;onChange:(value:unknown)=>void}){
  const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=urls.length)return;const next=[...urls];[next[index],next[target]]=[next[target],next[index]];onChange(next);};
  return <div className={className}><p className="mb-2">Gallery images</p>{urls.length>0&&<div className="mb-4 grid gap-3 sm:grid-cols-2">{urls.map((url,index)=><div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-[hsl(var(--admin-border))]"><img src={url} alt={`Gallery ${index+1}`} className="aspect-video w-full object-cover"/><div className="flex items-center justify-between gap-2 p-2"><span className="text-xs text-muted-foreground">Position {index+1}</span><div className="flex gap-1"><button type="button" disabled={index===0} onClick={()=>move(index,-1)} className={adminSecondaryButton}>↑</button><button type="button" disabled={index===urls.length-1} onClick={()=>move(index,1)} className={adminSecondaryButton}>↓</button><button type="button" onClick={()=>onChange(urls.filter((_,item)=>item!==index))} className={adminSecondaryButton}>Remove</button></div></div></div>)}</div>}<HeroImageField value={null} altText="Event gallery image" title="Add gallery image" csrfToken={csrfToken} onChange={(media)=>{if(media&&!urls.includes(media.url))onChange([...urls,media.url]);}} onAltTextChange={()=>undefined} onUploadingChange={()=>undefined}/></div>;
}
