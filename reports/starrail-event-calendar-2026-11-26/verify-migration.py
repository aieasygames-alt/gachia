# -*- coding: utf-8 -*-
"""Compare all original columns/rows, including history, in the isolated probe."""
import json,pathlib,sqlite3
r=pathlib.Path(__file__).resolve().parent
quote=lambda name:'"'+name.replace('"','""')+'"'
with sqlite3.connect('file:'+str(r/'.private/cms-before-migration.db')+'?mode=ro',uri=True) as before,sqlite3.connect('file:'+str(r/'.private/probe.db')+'?mode=ro',uri=True) as after:
 assert after.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 tables=lambda db:{x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
 assert tables(before)==tables(after)
 checks=[]
 for table in sorted(tables(before)):
  columns=[row[1] for row in before.execute('PRAGMA table_info('+quote(table)+')')]
  newcols=[row[1] for row in after.execute('PRAGMA table_info('+quote(table)+')')]
  extra={'game_updates':['event_schedule'],'_game_updates_v':['version_event_schedule']}.get(table,[])
  assert newcols==columns+extra,(table,'unexpected schema changes')
  sql='SELECT '+','.join(map(quote,columns))+' FROM '+quote(table)
  oldrows=before.execute(sql).fetchall();newrows=after.execute(sql).fetchall()
  if table=='payload_migrations':
   assert all(row in newrows for row in oldrows) and len(newrows)==len(oldrows)+1
  else:assert sorted(oldrows,key=repr)==sorted(newrows,key=repr),(table,'original rows changed')
  checks.append({'table':table,'originalRowsPreserved':len(oldrows),'addedNullableColumns':extra})
 with (r/'migration-data-acceptance.json').open('x') as output:
  json.dump({'status':'passed','originalTablesAndHistoryPreserved':True,'onlyMigrationMetadataRowAdded':True,'integrity':'ok','tables':checks},output,indent=2);output.write('\n')
print('Isolated migration preserved all original tables, columns, rows and version history')
