import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type ReportType = 'user' | 'post' | 'comment' | 'chat' | 'other';
export type ReportReason =
  | 'spam'
  | 'abuse'
  | 'inappropriate'
  | 'fake'
  | 'privacy'
  | 'other';

export interface ReportData {
  targetType: ReportType;
  targetId: string;
  targetUserId?: string;
  reason: ReportReason;
  description?: string;
  reporterId: string;
  reporterEmail?: string;
}

export const submitReport = async (data: ReportData): Promise<void> => {
  await addDoc(collection(db, 'reports'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isResolved: false,
    resolvedAt: null,
    resolvedBy: null,
    adminMemo: '',
  });
};
