/**
 * inboxService — « Mes notifications » : ce que Dr Lô a envoyé (collection notifications,
 * lecture et « lu » réservés à la personne par les règles Firestore existantes).
 * Seuls les types de Dr Lô sont montrés ici (pas les anciennes notifications de rendez-vous).
 */
import { collection, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  at: number;
  read: boolean;
}

const OURS = /^(drlo_|defi_response$)/;

export async function loadInbox(uid: string): Promise<InboxItem[]> {
  try {
    const snap = await getDocs(query(collection(db!, 'notifications'), where('userId', '==', uid), limit(60)));
    return snap.docs
      .map(d => {
        const v = d.data() as { type?: string; title?: string; content?: string; link?: string; read?: boolean; createdAt?: { toMillis?: () => number }; sourceId?: string };
        const kind = String(v.type ?? '');
        return {
          id: d.id,
          kind,
          title: v.title ?? 'Dr Lô',
          body: v.content ?? '',
          link: v.link ?? (kind === 'defi_response' && v.sourceId ? `/defi/${v.sourceId}/suivi` : '/'),
          at: v.createdAt?.toMillis ? v.createdAt.toMillis() : 0,
          read: !!v.read,
        };
      })
      .filter(i => OURS.test(i.kind))
      .sort((a, b) => b.at - a.at)
      .slice(0, 30);
  } catch {
    return [];
  }
}

export async function markRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => updateDoc(doc(db!, 'notifications', id), { read: true }).catch(() => {})));
}
