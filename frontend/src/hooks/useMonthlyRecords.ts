import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monthlyRecordsApi, type MonthlyRecordInput } from '../api/monthlyRecords';
import { evidenceApi } from '../api/evidence';

export function monthlyRecordsKey(billId: number, year: number) {
  return ['monthly-records', billId, year];
}

export function useMonthlyRecords(billId: number, year: number) {
  return useQuery({ queryKey: monthlyRecordsKey(billId, year), queryFn: () => monthlyRecordsApi.listForBill(billId, year) });
}

export function useUpdateMonthlyRecord(billId: number, year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: MonthlyRecordInput }) => monthlyRecordsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthlyRecordsKey(billId, year) }),
  });
}

export function useUploadEvidence(billId: number, year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ monthlyRecordId, files }: { monthlyRecordId: number; files: File[] }) =>
      evidenceApi.upload(monthlyRecordId, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthlyRecordsKey(billId, year) }),
  });
}

export function useDeleteEvidence(billId: number, year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => evidenceApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthlyRecordsKey(billId, year) }),
  });
}
