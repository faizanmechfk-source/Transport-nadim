import { MatchEntry, MatchStatus, MedicalMatchEntry } from '../types';

export interface RawTransportEntry {
  biltyNumber: string;
  date: string;
  party: string;
  vehicle: string;
  amount: number;
  weight?: number;
}

export interface RawMedicalEntry {
  entryNumber: string;
  date: string;
  party: string;
  item: string;
  quantity: number;
  batch: string;
  amount: number;
}

export class MatchingService {
  /**
   * Reconcile two transport datasets (e.g., Booking Office vs Transporter Delivery)
   */
  public static reconcileTransportEntries(setA: RawTransportEntry[], setB: RawTransportEntry[]): MatchEntry[] {
    const results: MatchEntry[] = [];
    const setBMatchedIds = new Set<number>();

    // Count duplicates in Set A
    const numCountsA = new Map<string, number>();
    setA.forEach((a) => {
      const key = a.biltyNumber.trim().toUpperCase();
      numCountsA.set(key, (numCountsA.get(key) || 0) + 1);
    });

    // Match Set A items
    setA.forEach((itemA, indexA) => {
      const keyA = itemA.biltyNumber.trim().toUpperCase();
      const isDuplicateA = (numCountsA.get(keyA) || 0) > 1;

      // Look for candidate in Set B
      const matchIndexB = setB.findIndex((b, idx) => !setBMatchedIds.has(idx) && b.biltyNumber.trim().toUpperCase() === keyA);

      if (matchIndexB >= 0) {
        setBMatchedIds.add(matchIndexB);
        const itemB = setB[matchIndexB];

        if (isDuplicateA) {
          results.push({
            id: `rec-${indexA}-${matchIndexB}-${Date.now()}`,
            biltyNumber: itemA.biltyNumber,
            date: itemA.date,
            partyA: itemA.party,
            partyB: itemB.party,
            vehicleA: itemA.vehicle,
            vehicleB: itemB.vehicle,
            amountA: itemA.amount,
            amountB: itemB.amount,
            weightA: itemA.weight || 0,
            weightB: itemB.weight || 0,
            status: 'Duplicate',
            diffNotes: [`Multiple entries found with Bilty #${itemA.biltyNumber} in booking log`],
            isVerified: false,
            sourceSet: 'Both',
          });
          return;
        }

        // Compare fields
        const diffs: string[] = [];
        if (Math.abs(itemA.amount - itemB.amount) > 0.01) {
          diffs.push(`Amount differs: Set A (₹${itemA.amount.toLocaleString()}) vs Set B (₹${itemB.amount.toLocaleString()}) [Diff: ₹${Math.abs(itemA.amount - itemB.amount).toLocaleString()}]`);
        }
        if (itemA.vehicle.trim().toUpperCase() !== itemB.vehicle.trim().toUpperCase()) {
          diffs.push(`Vehicle differs: Set A (${itemA.vehicle}) vs Set B (${itemB.vehicle})`);
        }
        if (itemA.party.trim().toLowerCase() !== itemB.party.trim().toLowerCase()) {
          diffs.push(`Party differs: Set A (${itemA.party}) vs Set B (${itemB.party})`);
        }
        if (itemA.date !== itemB.date) {
          diffs.push(`Date differs: Set A (${itemA.date}) vs Set B (${itemB.date})`);
        }
        if (itemA.weight && itemB.weight && Math.abs(itemA.weight - itemB.weight) > 1) {
          diffs.push(`Weight differs: Set A (${itemA.weight} kg) vs Set B (${itemB.weight} kg)`);
        }

        const status: MatchStatus = diffs.length === 0 ? 'Matched' : 'Partially Matched';

        results.push({
          id: `rec-${indexA}-${matchIndexB}-${Date.now()}`,
          biltyNumber: itemA.biltyNumber,
          date: itemA.date,
          partyA: itemA.party,
          partyB: itemB.party,
          vehicleA: itemA.vehicle,
          vehicleB: itemB.vehicle,
          amountA: itemA.amount,
          amountB: itemB.amount,
          weightA: itemA.weight || 0,
          weightB: itemB.weight || 0,
          status,
          diffNotes: diffs.length > 0 ? diffs : ['All primary fields match exactly'],
          isVerified: status === 'Matched',
          sourceSet: 'Both',
        });
      } else {
        // Missing in Set B
        results.push({
          id: `rec-missA-${indexA}-${Date.now()}`,
          biltyNumber: itemA.biltyNumber,
          date: itemA.date,
          partyA: itemA.party,
          partyB: '-',
          vehicleA: itemA.vehicle,
          vehicleB: '-',
          amountA: itemA.amount,
          amountB: 0,
          weightA: itemA.weight || 0,
          weightB: 0,
          status: 'Missing',
          diffNotes: [`Record present in Set A (Booking Entry) but missing in Set B (Delivery/Transporter Entry)`],
          isVerified: false,
          sourceSet: 'A',
        });
      }
    });

    // Remaining items in Set B that were not matched (Missing in Set A)
    setB.forEach((itemB, indexB) => {
      if (!setBMatchedIds.has(indexB)) {
        results.push({
          id: `rec-missB-${indexB}-${Date.now()}`,
          biltyNumber: itemB.biltyNumber,
          date: itemB.date,
          partyA: '-',
          partyB: itemB.party,
          vehicleA: '-',
          vehicleB: itemB.vehicle,
          amountA: 0,
          amountB: itemB.amount,
          weightA: 0,
          weightB: itemB.weight || 0,
          status: 'Missing',
          diffNotes: [`Record present in Set B (Delivery/Transporter Entry) but missing in Set A (Booking Entry)`],
          isVerified: false,
          sourceSet: 'B',
        });
      }
    });

    return results;
  }

  /**
   * Reconcile two medical datasets (e.g. Warehouse Dispatch vs Hospital / Chemist Receiving)
   */
  public static reconcileMedicalEntries(setA: RawMedicalEntry[], setB: RawMedicalEntry[]): MedicalMatchEntry[] {
    const results: MedicalMatchEntry[] = [];
    const setBMatchedIds = new Set<number>();

    const numCountsA = new Map<string, number>();
    setA.forEach((a) => {
      const key = a.entryNumber.trim().toUpperCase();
      numCountsA.set(key, (numCountsA.get(key) || 0) + 1);
    });

    setA.forEach((itemA, indexA) => {
      const keyA = itemA.entryNumber.trim().toUpperCase();
      const isDuplicateA = (numCountsA.get(keyA) || 0) > 1;

      const matchIndexB = setB.findIndex((b, idx) => !setBMatchedIds.has(idx) && b.entryNumber.trim().toUpperCase() === keyA);

      if (matchIndexB >= 0) {
        setBMatchedIds.add(matchIndexB);
        const itemB = setB[matchIndexB];

        if (isDuplicateA) {
          results.push({
            id: `med-rec-${indexA}-${matchIndexB}`,
            entryNumber: itemA.entryNumber,
            date: itemA.date,
            partyA: itemA.party,
            partyB: itemB.party,
            itemA: itemA.item,
            itemB: itemB.item,
            quantityA: itemA.quantity,
            quantityB: itemB.quantity,
            batchA: itemA.batch,
            batchB: itemB.batch,
            amountA: itemA.amount,
            amountB: itemB.amount,
            status: 'Duplicate',
            diffNotes: [`Duplicate medical entry number #${itemA.entryNumber}`],
            isVerified: false,
            sourceSet: 'Both',
          });
          return;
        }

        const diffs: string[] = [];
        if (Math.abs(itemA.quantity - itemB.quantity) > 0) {
          diffs.push(`Quantity difference: Set A (${itemA.quantity}) vs Set B (${itemB.quantity}) [Diff: ${Math.abs(itemA.quantity - itemB.quantity)}]`);
        }
        if (Math.abs(itemA.amount - itemB.amount) > 0.01) {
          diffs.push(`Amount difference: Set A (₹${itemA.amount.toLocaleString()}) vs Set B (₹${itemB.amount.toLocaleString()}) [Diff: ₹${Math.abs(itemA.amount - itemB.amount).toLocaleString()}]`);
        }
        if (itemA.batch.trim().toUpperCase() !== itemB.batch.trim().toUpperCase()) {
          diffs.push(`Batch number differs: Set A (${itemA.batch}) vs Set B (${itemB.batch})`);
        }
        if (itemA.party.trim().toLowerCase() !== itemB.party.trim().toLowerCase()) {
          diffs.push(`Party differs: Set A (${itemA.party}) vs Set B (${itemB.party})`);
        }

        const status: MatchStatus = diffs.length === 0 ? 'Matched' : 'Partially Matched';

        results.push({
          id: `med-rec-${indexA}-${matchIndexB}`,
          entryNumber: itemA.entryNumber,
          date: itemA.date,
          partyA: itemA.party,
          partyB: itemB.party,
          itemA: itemA.item,
          itemB: itemB.item,
          quantityA: itemA.quantity,
          quantityB: itemB.quantity,
          batchA: itemA.batch,
          batchB: itemB.batch,
          amountA: itemA.amount,
          amountB: itemB.amount,
          status,
          diffNotes: diffs.length > 0 ? diffs : ['Exact match on item, batch, quantity, and amount'],
          isVerified: status === 'Matched',
          sourceSet: 'Both',
        });
      } else {
        results.push({
          id: `med-rec-missA-${indexA}`,
          entryNumber: itemA.entryNumber,
          date: itemA.date,
          partyA: itemA.party,
          partyB: '-',
          itemA: itemA.item,
          itemB: '-',
          quantityA: itemA.quantity,
          quantityB: 0,
          batchA: itemA.batch,
          batchB: '-',
          amountA: itemA.amount,
          amountB: 0,
          status: 'Missing',
          diffNotes: ['Medical entry available in dispatch record but missing in receiving register'],
          isVerified: false,
          sourceSet: 'A',
        });
      }
    });

    setB.forEach((itemB, indexB) => {
      if (!setBMatchedIds.has(indexB)) {
        results.push({
          id: `med-rec-missB-${indexB}`,
          entryNumber: itemB.entryNumber,
          date: itemB.date,
          partyA: '-',
          partyB: itemB.party,
          itemA: '-',
          itemB: itemB.item,
          quantityA: 0,
          quantityB: itemB.quantity,
          batchA: '-',
          batchB: itemB.batch,
          amountA: 0,
          amountB: itemB.amount,
          status: 'Missing',
          diffNotes: ['Medical entry present in receiving register but missing in dispatch record'],
          isVerified: false,
          sourceSet: 'B',
        });
      }
    });

    return results;
  }
}
