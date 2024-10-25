import {
  $ensureDir,
  $fs,
  $readFile,
  $writeFile,
  catchENOENT,
  produce,
  R,
  stableStringify,
} from '@openint/util'
import {
  convBeanFile,
  defaultOptions,
  sortBeanEntries,
} from './beancountConverters'

// For use from Beancount destination

export async function beanJsonToDir({
  operatingCurrency,
  outPath,
  beanJson,
}: {
  operatingCurrency?: string
  outPath: string
  beanJson: Beancount.JSONExport
}) {
  console.log('Will output bean to directory', {outPath})
  // rm -rf existing directory would be good, so we are atomtic

  await $ensureDir(outPath)
  console.log('Ensured dir at', {outPath})

  const entriesByPeriod = R.pipe(
    beanJson.entries,
    R.groupBy((entry) => entry.entry.date.slice(0, '2022-01'.length)),
    R.toPairs,
    R.groupBy((pair) => pair[0].slice(0, '2022'.length)),
    R.toPairs,
    R.flatMap(
      ([year, monthlyEntries]): Array<[string, Beancount.WrappedEntry[]]> => {
        const yearlyEntries = monthlyEntries.reduce((acc, me) => {
          acc.push(...me[1])
          return acc
        }, [] as Beancount.WrappedEntry[])

        if (
          yearlyEntries.length <= 100 ||
          !yearlyEntries.some((e) => e.type === 'Transaction')
        ) {
          return [[year, yearlyEntries]]
        }
        return monthlyEntries
      },
    ),
    // Not sure why but we need this hack in order for types to work
    (tuples) => R.fromPairs(tuples),
  )

  // Consider adding a concurrency limit to this.
  const pathsWritten = await Promise.all(
    Object.entries(entriesByPeriod).map(async ([month, entries]) => {
      const monthlyBeanJson: Beancount.JSONExport = {
        ...beanJson,
        // All options shall be in the index file itself. Options rendering are not
        // really supported in python anyways... Honestly better off removing to avoid any confusion
        options: {},
        entries,
      }
      const monthlyBeanString = await convBeanFile.reverse(monthlyBeanJson)
      const filename = `${outPath}/${month}.bean`
      await $writeFile(
        filename,
        // This allows the beancount file to not error in the editor to look nice
        // Doesn't make a difference as all accounts should have normally been declared anyways.
        [
          '; imported from "./index.bean". auto_accounts plugin added for fewer editor compliants',
          'plugin "beancount.plugins.auto_accounts"\n', // extra space
          monthlyBeanString,
        ].join('\n'),
        // Btw beancount.plugins.auto is auto_accounts + implicit_prices
      )
      if (debuggingBeanJson) {
        void $writeFile(
          `${filename}.json`,
          stableStringify(monthlyBeanJson, {space: 2}),
        )
      }
      console.log(`[bean-fs] Wrote to ${filename}`)
      return filename
    }),
  )
  pathsWritten.push(
    await R.pipe(`${outPath}/index.bean`, (p) =>
      $writeFile(
        p,
        R.compact([
          `${defaultOptions(operatingCurrency)}`,
          ...Object.keys(entriesByPeriod).map(
            (month) => `include "./${month}.bean"`,
          ),
        ]).join('\n'),
      ).then(() => p),
    ),
  )
  const filePaths = await readDir(outPath)
  await R.pipe(new Set(pathsWritten), (written) =>
    Promise.all(
      filePaths.map((fp) => {
        if (!written.has(fp)) {
          console.log('Removing orphan at', fp)
          return $fs().rm(fp, {recursive: true}).catch(catchENOENT(null))
        }
        return Promise.resolve()
      }),
    ),
  )
  console.log('Did separate bean file to directory', {outPath})
}

const debuggingBeanJson = false

// MARK: - For CLI use mainly
/**
 * Apply beancount plugins...
 * TODO: Figure out why normalizing in memory is diff than normalizing on disk
 */
export async function normalizeBeanFile(beanPath: string) {
  console.log('Will normalizeBeanFile', beanPath)
  const inBeanString = await $readFile(beanPath)
  if (typeof inBeanString !== 'string') {
    return
  }
  const inBeanJson = await convBeanFile(inBeanString)
  // console.dir(inBeanJson, {depth: null})
  const outBeanJson = produce(inBeanJson, (draft) => {
    draft.entries = sortBeanEntries(draft.entries)
  })
  // console.dir(outBeanJson, {depth: null})
  const outBeanString = await convBeanFile.reverse(outBeanJson)
  await $writeFile(beanPath, outBeanString)
  console.log('Did normalizeBeanFile', beanPath)
}

/** Normalize a single beancount file a directory of files */
export async function beanFileToDir(
  inPath: string,
  {operatingCurrency}: {operatingCurrency?: string} = {},
) {
  const outPath = inPath.replace(/\.bean$/, '')
  console.log('Will separate bean file to directory', {inPath, outPath})

  const beanString = await $readFile(inPath)
  if (typeof beanString !== 'string') {
    return
  }
  const beanJson = await convBeanFile(beanString)
  await beanJsonToDir({outPath, beanJson, operatingCurrency})
}

// TODO: Add a fs utils...
async function readDir(absPath: string) {
  const files = await $fs()
    .readdir(absPath, {withFileTypes: true})
    .catch(() => null)
  const filePaths = (files ?? [])
    .filter((f) => f.isFile())
    .map((f) => `${absPath}/${f.name}`)
  return filePaths
}
