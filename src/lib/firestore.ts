import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Chat } from '@/types';

const CHATS_COLLECTION = 'chats';

/**
 * Remove undefined values recursively before saving to Firestore,
 * because Firestore throws an error on `undefined` fields.
 */
function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitizeForFirestore);
  const cleaned: Record<string, any> = {};
  for (const [key, v] of Object.entries(val)) {
    if (v !== undefined) {
      cleaned[key] = sanitizeForFirestore(v);
    }
  }
  return cleaned;
}

/**
 * Fetch all chats from Firestore ordered by updatedAt descending
 */
export async function loadChatsFromFirestore(): Promise<Chat[]> {
  if (!db || !isFirebaseConfigured) return [];

  try {
    const chatsRef = collection(db, CHATS_COLLECTION);
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    const chats: Chat[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      chats.push({
        id: docSnap.id,
        title: data.title || 'New chat',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        model: data.model || 'qwen/qwen3.8-27b',
        messages: Array.isArray(data.messages) ? data.messages : [],
        pinned: Boolean(data.pinned),
      });
    });

    return chats;
  } catch (error) {
    console.warn('Firestore loadChats error:', error);
    return [];
  }
}

/**
 * Save or update a single chat in Firestore
 */
export async function saveChatToFirestore(chat: Chat): Promise<void> {
  if (!db || !isFirebaseConfigured || !chat.id) return;

  try {
    const chatDocRef = doc(db, CHATS_COLLECTION, chat.id);
    const sanitized = sanitizeForFirestore(chat);
    await setDoc(chatDocRef, sanitized, { merge: true });
  } catch (error) {
    console.warn(`Firestore saveChat error for chat ${chat.id}:`, error);
  }
}

/**
 * Delete a single chat from Firestore
 */
export async function deleteChatFromFirestore(chatId: string): Promise<void> {
  if (!db || !isFirebaseConfigured || !chatId) return;

  try {
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    await deleteDoc(chatDocRef);
  } catch (error) {
    console.warn(`Firestore deleteChat error for chat ${chatId}:`, error);
  }
}

/**
 * Clear all chats in Firestore
 */
export async function clearAllChatsFromFirestore(chats: Chat[]): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const batch = writeBatch(db);
    for (const chat of chats) {
      const chatDocRef = doc(db, CHATS_COLLECTION, chat.id);
      batch.delete(chatDocRef);
    }
    await batch.commit();
  } catch (error) {
    console.warn('Firestore clearAllChats error:', error);
  }
}
