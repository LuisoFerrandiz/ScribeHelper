import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';
import { seedBasePhrases } from './seedPhrases.js';
import { seedAdminUser } from './seedAdmin.js';

const schemaPath = path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

db.exec(schema);
console.log('Schema applied:', schemaPath);

seedBasePhrases();
seedAdminUser();
