import {RowIdMaker} from './RowIdMaker'

test('uniqueIdForRow for duplicate rows', () => {
  const maker = new RowIdMaker()
  const row = {
    Date: '03/06/2019',
    Description: 'ATM Debit',
    Amount: '-115.19,03',
    Details: '06 SP * ATOMS SHOES HTTPSWEARATOMCA  / 5089/',
  }
  const id1 = maker.uniqueIdForRow(row)
  const id2 = maker.uniqueIdForRow(row)
  expect(id1).not.toEqual(id2)

  expect(id2).toBe(`${id1}-2`)
})
