export namespace models {
	
	export class CaptionVariant {
	    tone: string;
	    label: string;
	    emoji: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new CaptionVariant(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tone = source["tone"];
	        this.label = source["label"];
	        this.emoji = source["emoji"];
	        this.content = source["content"];
	    }
	}
	export class CaptionResult {
	    captions: CaptionVariant[];
	    doc_title: string;
	    hashtags: string[];
	
	    static createFrom(source: any = {}) {
	        return new CaptionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.captions = this.convertValues(source["captions"], CaptionVariant);
	        this.doc_title = source["doc_title"];
	        this.hashtags = source["hashtags"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Category {
	    id: string;
	    name: string;
	    icon: string;
	    color: string;
	    parent_id: string;
	    sort_order: number;
	    count: number;
	    children?: Category[];
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.icon = source["icon"];
	        this.color = source["color"];
	        this.parent_id = source["parent_id"];
	        this.sort_order = source["sort_order"];
	        this.count = source["count"];
	        this.children = this.convertValues(source["children"], Category);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ChatMessage {
	    role: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new ChatMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.content = source["content"];
	    }
	}
	export class ChatResponse {
	    answer: string;
	    citations: string[];
	    isOnTopic: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ChatResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.answer = source["answer"];
	        this.citations = source["citations"];
	        this.isOnTopic = source["isOnTopic"];
	    }
	}
	export class CreateDocumentInput {
	    title: string;
	    type: string;
	    cat_id: string;
	    sub_cat_id: string;
	    file_path: string;
	    content: string;
	    tags: string[];
	    author: string;
	    read_time: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateDocumentInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.type = source["type"];
	        this.cat_id = source["cat_id"];
	        this.sub_cat_id = source["sub_cat_id"];
	        this.file_path = source["file_path"];
	        this.content = source["content"];
	        this.tags = source["tags"];
	        this.author = source["author"];
	        this.read_time = source["read_time"];
	    }
	}
	export class TagCount {
	    tag: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new TagCount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tag = source["tag"];
	        this.count = source["count"];
	    }
	}
	export class WorkoutPlan {
	    id: string;
	    doc_id: string;
	    goal: string;
	    level: string;
	    duration_weeks: number;
	    sessions_per_week: number;
	    exercises: any;
	
	    static createFrom(source: any = {}) {
	        return new WorkoutPlan(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.doc_id = source["doc_id"];
	        this.goal = source["goal"];
	        this.level = source["level"];
	        this.duration_weeks = source["duration_weeks"];
	        this.sessions_per_week = source["sessions_per_week"];
	        this.exercises = source["exercises"];
	    }
	}
	export class Document {
	    id: string;
	    title: string;
	    type: string;
	    cat_id: string;
	    sub_cat_id: string;
	    file_path: string;
	    content: string;
	    summary: string;
	    cover_path: string;
	    tags: string[];
	    views: number;
	    read_time: number;
	    is_saved: boolean;
	    author: string;
	    created_at: string;
	    updated_at: string;
	    is_locked: boolean;
	    preview_lines: number;
	    workout_plan?: WorkoutPlan;
	
	    static createFrom(source: any = {}) {
	        return new Document(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.type = source["type"];
	        this.cat_id = source["cat_id"];
	        this.sub_cat_id = source["sub_cat_id"];
	        this.file_path = source["file_path"];
	        this.content = source["content"];
	        this.summary = source["summary"];
	        this.cover_path = source["cover_path"];
	        this.tags = source["tags"];
	        this.views = source["views"];
	        this.read_time = source["read_time"];
	        this.is_saved = source["is_saved"];
	        this.author = source["author"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.is_locked = source["is_locked"];
	        this.preview_lines = source["preview_lines"];
	        this.workout_plan = this.convertValues(source["workout_plan"], WorkoutPlan);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DashboardStats {
	    total_documents: number;
	    by_type: Record<string, number>;
	    total_views: number;
	    recent_reads: Document[];
	    trending_tags: TagCount[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_documents = source["total_documents"];
	        this.by_type = source["by_type"];
	        this.total_views = source["total_views"];
	        this.recent_reads = this.convertValues(source["recent_reads"], Document);
	        this.trending_tags = this.convertValues(source["trending_tags"], TagCount);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DocumentFilter {
	    cat_id: string;
	    sub_cat_id: string;
	    type: string;
	    tag: string;
	    is_saved?: boolean;
	    sort_by: string;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new DocumentFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cat_id = source["cat_id"];
	        this.sub_cat_id = source["sub_cat_id"];
	        this.type = source["type"];
	        this.tag = source["tag"];
	        this.is_saved = source["is_saved"];
	        this.sort_by = source["sort_by"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class ImportQueueItem {
	    id: string;
	    file_path: string;
	    file_name: string;
	    file_type: string;
	    status: string;
	    error_msg: string;
	    progress: number;
	    doc_id?: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportQueueItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.file_path = source["file_path"];
	        this.file_name = source["file_name"];
	        this.file_type = source["file_type"];
	        this.status = source["status"];
	        this.error_msg = source["error_msg"];
	        this.progress = source["progress"];
	        this.doc_id = source["doc_id"];
	        this.created_at = source["created_at"];
	    }
	}
	export class QueueStatus {
	    items: ImportQueueItem[];
	    running: boolean;
	    paused: boolean;
	    total: number;
	    done: number;
	    pending: number;
	
	    static createFrom(source: any = {}) {
	        return new QueueStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], ImportQueueItem);
	        this.running = source["running"];
	        this.paused = source["paused"];
	        this.total = source["total"];
	        this.done = source["done"];
	        this.pending = source["pending"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ReadingProgressDTO {
	    doc_id: string;
	    scroll_percent: number;
	    page_number: number;
	    total_pages: number;
	    last_read_at: string;
	    reading_time_seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new ReadingProgressDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.doc_id = source["doc_id"];
	        this.scroll_percent = source["scroll_percent"];
	        this.page_number = source["page_number"];
	        this.total_pages = source["total_pages"];
	        this.last_read_at = source["last_read_at"];
	        this.reading_time_seconds = source["reading_time_seconds"];
	    }
	}
	export class SearchResult {
	    id: string;
	    title: string;
	    type: string;
	    cat_id: string;
	    sub_cat_id: string;
	    file_path: string;
	    content: string;
	    summary: string;
	    cover_path: string;
	    tags: string[];
	    views: number;
	    read_time: number;
	    is_saved: boolean;
	    author: string;
	    created_at: string;
	    updated_at: string;
	    is_locked: boolean;
	    preview_lines: number;
	    workout_plan?: WorkoutPlan;
	    snippet: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.type = source["type"];
	        this.cat_id = source["cat_id"];
	        this.sub_cat_id = source["sub_cat_id"];
	        this.file_path = source["file_path"];
	        this.content = source["content"];
	        this.summary = source["summary"];
	        this.cover_path = source["cover_path"];
	        this.tags = source["tags"];
	        this.views = source["views"];
	        this.read_time = source["read_time"];
	        this.is_saved = source["is_saved"];
	        this.author = source["author"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.is_locked = source["is_locked"];
	        this.preview_lines = source["preview_lines"];
	        this.workout_plan = this.convertValues(source["workout_plan"], WorkoutPlan);
	        this.snippet = source["snippet"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ShareEvent {
	    id: number;
	    doc_id: string;
	    doc_title: string;
	    tone: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ShareEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.doc_id = source["doc_id"];
	        this.doc_title = source["doc_title"];
	        this.tone = source["tone"];
	        this.created_at = source["created_at"];
	    }
	}
	
	export class TermExplanation {
	    term: string;
	    simple: string;
	    detail: string;
	    example: string;
	    relatedTerms: string[];
	    isKnown: boolean;
	    isOffline: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TermExplanation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.term = source["term"];
	        this.simple = source["simple"];
	        this.detail = source["detail"];
	        this.example = source["example"];
	        this.relatedTerms = source["relatedTerms"];
	        this.isKnown = source["isKnown"];
	        this.isOffline = source["isOffline"];
	    }
	}
	export class UpdateDocumentInput {
	    title?: string;
	    content?: string;
	    summary?: string;
	    cover_path?: string;
	    tags?: string[];
	    sub_cat_id?: string;
	    is_saved?: boolean;
	    read_time?: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateDocumentInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.content = source["content"];
	        this.summary = source["summary"];
	        this.cover_path = source["cover_path"];
	        this.tags = source["tags"];
	        this.sub_cat_id = source["sub_cat_id"];
	        this.is_saved = source["is_saved"];
	        this.read_time = source["read_time"];
	    }
	}

}

