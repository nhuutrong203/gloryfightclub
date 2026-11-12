import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// Dates use YYYY-MM-DD, timestamps use Unix milliseconds, and images use R2 keys.
// Public text uses an English companion with Vietnamese fallback.

const id = () => integer('id').primaryKey({ autoIncrement: true });
const createdAt = () => integer('created_at').notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () => integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`);
const isPublic = () => integer('is_public', { mode: 'boolean' }).notNull().default(true);
const sort = () => integer('sort').notNull().default(0);

// System tables

export const users = sqliteTable('users', {
  id: id(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['owner', 'coach'] }).notNull().default('coach'),
  // Owners choose coach permissions. Owners always have full access.
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  coachId: integer('coach_id').references(() => coaches.id, { onDelete: 'set null' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // SHA-256 hash of the cookie token.
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
});

// Shared club settings, including contact details, hero, and About content.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});

// Public content

export const locations = sqliteTable('locations', {
  id: id(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  address: text('address').notNull(),
  mapUrl: text('map_url'),
  phone: text('phone'),
  scheduleImageKey: text('schedule_image_key'), // Optional schedule image shown on the Schedule page.
  sort: sort(),
});

export const disciplines = sqliteTable('disciplines', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  summary: text('summary'),
  summaryEn: text('summary_en'),
  description: text('description'),
  descriptionEn: text('description_en'),
  coverKey: text('cover_key'),
  hasBelts: integer('has_belts', { mode: 'boolean' }).notNull().default(false),
  isPublic: isPublic(),
  sort: sort(),
});

// Vietnamese day codes: 246 is Mon/Wed/Fri, 357 is Tue/Thu/Sat, and 8 is Sunday.
export const classes = sqliteTable('classes', {
  id: id(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  disciplineIds: text('discipline_ids', { mode: 'json' }).$type<number[]>().notNull().default(sql`'[]'`),
  locationId: integer('location_id').notNull().references(() => locations.id),
  days: text('days').notNull(),
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(),
  coachId: integer('coach_id').references(() => coaches.id, { onDelete: 'set null' }),
  level: text('level', { enum: ['all', 'beginner', 'intermediate', 'advanced', 'kids'] }).notNull().default('all'),
  note: text('note'),
  noteEn: text('note_en'),
  isPublic: isPublic(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (t) => [index('classes_location_idx').on(t.locationId)]);

export const coaches = sqliteTable('coaches', {
  id: id(),
  slug: text('slug').notNull().unique(),
  fullName: text('full_name').notNull(),
  photoKey: text('photo_key'),
  title: text('title'), // vd. "Head Coach"
  titleEn: text('title_en'),
  bio: text('bio'),
  bioEn: text('bio_en'),
  achievements: text('achievements'), // One achievement per line.
  achievementsEn: text('achievements_en'),
  disciplineIds: text('discipline_ids', { mode: 'json' }).$type<number[]>().notNull().default(sql`'[]'`),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  isPublic: isPublic(),
  sort: sort(),
});

export const belts = sqliteTable('belts', {
  id: id(),
  disciplineId: integer('discipline_id').notNull().references(() => disciplines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  color: text('color').notNull(), // hex
  rank: integer('rank').notNull(),
  requirements: text('requirements'),
  requirementsEn: text('requirements_en'),
  minMonths: integer('min_months'),
});

// Monthly membership plans.
export const feePlans = sqliteTable('fee_plans', {
  id: id(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  headline: text('headline'), // Short summary of the plan.
  headlineEn: text('headline_en'),
  condition: text('condition'), // Plan restrictions and exceptions.
  conditionEn: text('condition_en'),
  audience: text('audience'), // Intended audience shown on the home and fees cards.
  audienceEn: text('audience_en'),
  pricePerMonth: integer('price_per_month').notNull(), // VND
  features: text('features'), // One benefit per line.
  featuresEn: text('features_en'),
  badge: text('badge'), // vd. "BEST CHOICE"
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  isPublic: isPublic(),
  sort: sort(),
});

export const posts = sqliteTable('posts', {
  id: id(),
  slug: text('slug').notNull().unique(),
  title: text('title'),
  titleEn: text('title_en'),
  content: text('content').notNull(),
  contentEn: text('content_en'),
  // HTML is sanitized editor content. Text is the legacy plain-text format.
  format: text('format', { enum: ['text', 'html'] }).notNull().default('text'),
  publishedAt: integer('published_at').notNull(), // A future value schedules publication.
  isPublic: isPublic(),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('posts_published_idx').on(t.publishedAt)]);

export const postImages = sqliteTable('post_images', {
  id: id(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  // image/video: key R2 · youtube: link YouTube
  type: text('type', { enum: ['image', 'video', 'youtube'] }).notNull().default('image'),
  key: text('key').notNull(),
  sort: sort(),
});

export const galleryItems = sqliteTable('gallery_items', {
  id: id(),
  type: text('type', { enum: ['photo', 'video'] }).notNull(),
  key: text('key'), // Image key.
  videoUrl: text('video_url'), // link YouTube / Facebook
  caption: text('caption'),
  captionEn: text('caption_en'),
  album: text('album'),
  isPublic: isPublic(),
  sort: sort(),
  createdAt: createdAt(),
});

export const testimonials = sqliteTable('testimonials', {
  id: id(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role'), // Relationship or role of the testimonial author.
  authorRoleEn: text('author_role_en'),
  content: text('content').notNull(),
  contentEn: text('content_en'),
  photoKey: text('photo_key'),
  isPublic: isPublic(),
  sort: sort(),
});

export const faqs = sqliteTable('faqs', {
  id: id(),
  question: text('question').notNull(),
  questionEn: text('question_en'),
  answer: text('answer').notNull(),
  answerEn: text('answer_en'),
  isPublic: isPublic(),
  sort: sort(),
});

export const achievements = sqliteTable('achievements', {
  id: id(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  eventName: text('event_name'),
  eventDate: text('event_date'),
  description: text('description'),
  descriptionEn: text('description_en'),
  imageKey: text('image_key'),
  coachId: integer('coach_id').references(() => coaches.id, { onDelete: 'set null' }),
  isPublic: isPublic(),
  sort: sort(),
});

// Private student records. Never expose them on public routes.

export const students = sqliteTable('students', {
  id: id(),
  code: text('code').notNull().unique(), // GF0001
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  birthYear: integer('birth_year'),
  parentName: text('parent_name'),
  parentPhone: text('parent_phone'),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  feePlanId: integer('fee_plan_id').references(() => feePlans.id, { onDelete: 'set null' }), // Current plan used to suggest the amount at collection.
  joinedAt: text('joined_at').notNull(),
  status: text('status', { enum: ['active', 'paused', 'quit'] }).notNull().default('active'),
  note: text('note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('students_name_idx').on(t.fullName), index('students_phone_idx').on(t.phone)]);

export const studentClasses = sqliteTable('student_classes', {
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.studentId, t.classId] })]);

export const payments = sqliteTable('payments', {
  id: id(),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  feePlanId: integer('fee_plan_id').references(() => feePlans.id, { onDelete: 'set null' }),
  month: text('month').notNull(), // 'YYYY-MM'
  amount: integer('amount').notNull(), // VND
  paidAt: text('paid_at').notNull(),
  method: text('method', { enum: ['cash', 'transfer'] }).notNull().default('cash'),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('payments_month_idx').on(t.month), uniqueIndex('payments_student_month_idx').on(t.studentId, t.month)]);

export const trialRegistrations = sqliteTable('trial_registrations', {
  id: id(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  age: integer('age'), // Age at sign-up. Older entries may not have a birth date.
  birthDate: text('birth_date'), // 'YYYY-MM-DD'
  disciplineId: integer('discipline_id').references(() => disciplines.id, { onDelete: 'set null' }),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  feePlanId: integer('fee_plan_id').references(() => feePlans.id, { onDelete: 'set null' }), // Plan of interest carried into the student record on conversion.
  preferredTime: text('preferred_time'),
  // Selected trial class and date. Conversion can assign the class to the student.
  classId: integer('class_id').references(() => classes.id, { onDelete: 'set null' }),
  trialDate: text('trial_date'),
  // Consent timestamp and rules version. A guardian confirms for minors.
  agreedAt: integer('agreed_at'),
  policyVersion: text('policy_version'),
  note: text('note'),
  status: text('status', { enum: ['new', 'contacted', 'enrolled', 'rejected'] }).notNull().default('new'),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('trial_student_idx').on(t.studentId), index('trial_status_idx').on(t.status)]);
