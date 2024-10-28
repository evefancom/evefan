#!/usr/bin/env tsx
import '@openint/app-config/register.node'
import {envRequired} from '@openint/app-config/env'
import path from 'node:path'
import {makePostgresClient} from '@openint/connector-postgres'

void makePostgresClient({
  databaseUrl: envRequired.POSTGRES_URL,
  migrationsPath: path.join(__dirname, '../web/migrations'),
  migrationTableName: '_migrations',
}).runMigratorCli()
