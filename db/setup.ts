import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

async function main() {
  console.log('Setting up database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  try {
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating categories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0 NOT NULL,
        icon TEXT,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating templates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        title_ar TEXT,
        slug TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        display_order INTEGER DEFAULT 0 NOT NULL,
        fields JSONB DEFAULT '[]' NOT NULL,
        default_values JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating template_fields table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_fields (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        label_ar TEXT,
        type TEXT DEFAULT 'text' NOT NULL,
        image_type TEXT,
        required BOOLEAN DEFAULT FALSE NOT NULL,
        default_value TEXT,
        placeholder TEXT,
        placeholder_ar TEXT,
        options JSONB DEFAULT '[]',
        position JSONB DEFAULT '{}',
        style JSONB DEFAULT '{}',
        display_order INTEGER DEFAULT 0 NOT NULL
      );
    `);
    
    console.log('Creating fonts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fonts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        family TEXT NOT NULL,
        type TEXT DEFAULT 'google' NOT NULL,
        url TEXT,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        is_rtl BOOLEAN DEFAULT FALSE NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Creating cards table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES templates(id),
        user_id INTEGER REFERENCES users(id),
        form_data JSONB NOT NULL,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_accessed TIMESTAMP,
        quality TEXT DEFAULT 'medium',
        public_id TEXT UNIQUE,
        access_count INTEGER DEFAULT 0 NOT NULL,
        settings JSONB DEFAULT '{}',
        status TEXT DEFAULT 'active' NOT NULL
      );
    `);
    
    console.log('Creating certificates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        title_ar TEXT,
        template_id INTEGER NOT NULL REFERENCES templates(id),
        user_id INTEGER REFERENCES users(id),
        certificate_type TEXT DEFAULT 'appreciation' NOT NULL,
        form_data JSONB NOT NULL,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expiry_date DATE,
        status TEXT DEFAULT 'active' NOT NULL,
        issued_to TEXT,
        issued_to_gender TEXT DEFAULT 'male',
        verification_code TEXT UNIQUE,
        public_id TEXT UNIQUE
      );
    `);
    
    console.log('Creating certificate_batches table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificate_batches (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        template_id INTEGER NOT NULL REFERENCES templates(id),
        status TEXT DEFAULT 'pending' NOT NULL,
        total_items INTEGER DEFAULT 0 NOT NULL,
        processed_items INTEGER DEFAULT 0 NOT NULL,
        source_type TEXT DEFAULT 'excel' NOT NULL,
        source_data TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP
      );
    `);
    
    console.log('Creating certificate_batch_items table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificate_batch_items (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES certificate_batches(id) ON DELETE CASCADE,
        certificate_id INTEGER REFERENCES certificates(id),
        status TEXT DEFAULT 'pending' NOT NULL,
        form_data JSONB NOT NULL,
        error_message TEXT,
        row_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        processed_at TIMESTAMP
      );
    `);
    
    console.log('Creating settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL,
        value JSONB NOT NULL,
        category TEXT DEFAULT 'general' NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_by INTEGER REFERENCES users(id)
      );
    `);
    
    console.log('Creating auth_settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_settings (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        client_id TEXT,
        client_secret TEXT,
        redirect_uri TEXT,
        enabled BOOLEAN DEFAULT FALSE NOT NULL,
        settings JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_by INTEGER REFERENCES users(id)
      );
    `);
    
    console.log('Creating seo table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        keywords JSONB DEFAULT '[]',
        og_image TEXT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        canonical_url TEXT,
        structured_data JSONB DEFAULT '{}',
        no_index BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_by INTEGER REFERENCES users(id)
      );
    `);
    
    console.log('Creating category_key_idx index on settings table...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS category_key_idx ON settings (category, key);
    `);
    
    console.log('Creating entity_type_id_idx index on seo table...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS entity_type_id_idx ON seo (entity_type, entity_id);
    `);
    
    console.log('Inserting admin user...');
    await pool.query(`
      INSERT INTO users (username, password, full_name, email, is_admin, role)
      VALUES ('admin', '$2a$10$eSqtHOWBTGhOiXQkB2NpT.BbH72SFoF98VYOU8QxiKTZKXJVDVsYu', 'Admin User', 'admin@example.com', TRUE, 'admin')
      ON CONFLICT (username) DO NOTHING;
    `);
    
    console.log('Inserting default category...');
    await pool.query(`
      INSERT INTO categories (name, slug, description, display_order, icon, active)
      VALUES ('شهادات التقدير', 'appreciation-certificates', 'شهادات تقدير للإنجازات المختلفة', 1, 'award', TRUE)
      ON CONFLICT (slug) DO NOTHING;
    `);
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);