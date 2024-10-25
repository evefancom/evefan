import type {Db} from 'mongodb'
import {MongoClient} from 'mongodb'
import type {AnyEntityPayload, ConnectorServer} from '@openint/cdk'
import {handlersLink} from '@openint/cdk'
import {zCast, zFunction} from '@openint/util'
import type {mongoSchemas} from './def'
import {mongoDef, zMongoConnection} from './def'

export const mongodbProvider = {
  destinationSync: ({settings}) => {
    const mongodb = mongoDBConnection(settings)
    void mongodb.initMongoDB()
    return handlersLink({
      data: ({data}) => {
        void mongodb.insertData(data)
      },
    })
  },
} satisfies ConnectorServer<typeof mongoSchemas>

const zData = zCast<AnyEntityPayload>()

export const mongoDBConnection = zFunction(
  zMongoConnection,
  ({databaseUrl, databaseName}) => {
    let db: Db
    const initMongoDB = async () => {
      const client = new MongoClient(databaseUrl)
      await client.connect()
      db = client.db(databaseName)

      // For initialize collection of each entity and prevent duplicated document.
      // Consider to use create unique index instead using _id (mongodb's ObjectId) because
      // the ObjectId need to pass strict params/input format https://www.mongodb.com/docs/v5.2/reference/method/ObjectId/
      void db.collection('transaction').createIndex(
        {id: 1, externalId: 1}, // TODO: Need to check the fields the should be unique or just use these fields
        {unique: true},
      )
      void db
        .collection('account')
        .createIndex({id: 1, externalId: 1}, {unique: true})

      console.log(`Successfully connected to database: ${db.databaseName}`)
    }

    return {
      initMongoDB: zFunction(async () => await initMongoDB()),
      insertData: zFunction(
        zData,
        async (data) =>
          db
            .collection(data.entityName)
            .insertOne(data)
            .then((_) => console.log(`Insert ${data.entityName} - ${data.id}`))
            .catch((err) => console.log(`Error: ${err}`)), // Need this format instead of just log the error when catch it to get the specific error, not sure why
      ),
    }
  },
)

export default mongoDef
