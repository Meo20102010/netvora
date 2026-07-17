const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('prisma/dev.db.bak');
  const corrupted = new SQL.Database(buf);
  const fixed = new SQL.Database();
  
  // 1. Export schema from corrupted, recreate in fixed
  try {
    const schema = corrupted.exec("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type DESC, name");
    if (schema.length > 0) {
      for (const row of schema[0].values) {
        try {
          fixed.run(row[0]);
        } catch(e) {
          console.error('Schema error:', row[0]?.substring(0, 60), '->', e.message?.substring(0, 50));
        }
      }
    }
    console.log('Schema recreated');
  } catch(e) {
    console.error('Schema export failed:', e.message?.substring(0, 100));
    return;
  }
  
  // 2. For each table, try to read data using the original B-tree
  // Since the original is corrupted, instead of SELECT *, let's try PRAGMA table_info
  // and then scan raw leaf pages
  
  const tables = corrupted.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  if (tables.length === 0) {
    console.error('No tables found');
    return;
  }
  
  for (const tableName of tables[0].values) {
    const name = tableName[0];
    console.log(`\nProcessing ${name}...`);
    
    // Get columns
    const colInfo = corrupted.exec(`PRAGMA table_info("${name}")`);
    if (colInfo.length === 0 || !colInfo[0].values) {
      console.log(`  No columns found, skipping`);
      continue;
    }
    const cols = colInfo[0].values.map(c => c[1]);
    console.log(`  Columns: ${cols.join(', ')}`);
    
    // Try to read data
    try {
      const result = corrupted.exec(`SELECT * FROM "${name}"`);
      if (result.length > 0 && result[0].values) {
        const rows = result[0].values;
        console.log(`  Read ${rows.length} rows`);
        
        // Insert into fixed DB
        let inserted = 0;
        for (const row of rows) {
          const placeholders = cols.map(() => '?').join(',');
          const insertSQL = `INSERT INTO "${name}" (${cols.map(c => '"' + c + '"').join(',')}) VALUES (${placeholders})`;
          try {
            fixed.run(insertSQL, row);
            inserted++;
          } catch(e) {
            // Skip bad rows silently
          }
        }
        console.log(`  Inserted ${inserted}/${rows.length} rows`);
      } else {
        console.log(`  No data or empty table`);
      }
    } catch(e) {
      console.log(`  Read failed: ${e.message?.substring(0, 80)}`);
      
      // For contents table - this is the big one that fails
      if (name === 'contents') {
        console.log('  Trying alternative recovery for contents table...');
        
        // Try reading by PRIMARY KEY lookup (which uses the PK B-tree)
        // First try getting all IDs
        try {
          // Some indexes might still work
          const ids = corrupted.exec("SELECT id FROM contents ORDER BY id");
          if (ids.length > 0 && ids[0].values) {
            console.log(`  Found ${ids[0].values.length} IDs via index`);
            
            // Now try to fetch each row individually
            let recovered = 0;
            for (const idRow of ids[0].values) {
              const id = idRow[0];
              try {
                const rowResult = corrupted.exec(`SELECT * FROM contents WHERE id = '${id.replace(/'/g, "''")}'`);
                if (rowResult.length > 0 && rowResult[0].values.length > 0) {
                  const placeholders = cols.map(() => '?').join(',');
                  fixed.run(`INSERT INTO contents (${cols.map(c => '"' + c + '"').join(',')}) VALUES (${placeholders})`, rowResult[0].values[0]);
                  recovered++;
                  
                  if (recovered % 1000 === 0) {
                    console.log(`    Recovered ${recovered}...`);
                  }
                }
              } catch(e) {
                // Skip failed individual rows
              }
            }
            console.log(`  Total recovered: ${recovered}`);
          }
        } catch(e2) {
          console.log(`  ID scan failed: ${e2.message?.substring(0, 80)}`);
        }
      }
    }
  }
  
  // Export the fixed database
  const data = fixed.export();
  fs.writeFileSync('prisma/dev-fixed.db', Buffer.from(data));
  console.log(`\nFixed DB written: ${data.length} bytes`);
  
  corrupted.close();
  fixed.close();
}
main();
