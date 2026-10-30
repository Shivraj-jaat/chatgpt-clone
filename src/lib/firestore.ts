import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Chat } from '@/types';

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
 * Get the Firestore collection reference depending on whether user is logged in
 */
function getChatsCollection(userId?: string | null): CollectionReference | null {
  if (!db) return null;
  if (userId) {
    return collection(db, 'users', userId, 'chats');
  }
  return collection(db, 'chats');
}

/**
 * Get the Firestore document reference for a chat
 */
function getChatDocRef(chatId: string, userId?: string | null): DocumentReference | null {
  if (!db) return null;
  if (userId) {
    return doc(db, 'users', userId, 'chats', chatId);
  }
  return doc(db, 'chats', chatId);
}

/**
 * Fetch all chats from Firestore ordered by updatedAt descending
 * (scoped to user if userId is provided)
 */
export async function loadChatsFromFirestore(userId?: string | null): Promise<Chat[]> {
  if (!db || !isFirebaseConfigured) return [];

  try {
    const chatsRef = getChatsCollection(userId);
    if (!chatsRef) return [];

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
        userId: userId || undefined,
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
 * (scoped to user if userId is provided)
 */
export async function saveChatToFirestore(chat: Chat, userId?: string | null): Promise<void> {
  if (!db || !isFirebaseConfigured || !chat.id) return;

  try {
    const chatDocRef = getChatDocRef(chat.id, userId);
    if (!chatDocRef) return;

    const chatToSave = {
      ...chat,
      userId: userId || chat.userId || null,
    };
    const sanitized = sanitizeForFirestore(chatToSave);
    await setDoc(chatDocRef, sanitized, { merge: true });
  } catch (error) {
    console.warn(`Firestore saveChat error for chat ${chat.id}:`, error);
  }
}

/**
 * Delete a single chat from Firestore
 */
export async function deleteChatFromFirestore(chatId: string, userId?: string | null): Promise<void> {
  if (!db || !isFirebaseConfigured || !chatId) return;

  try {
    const chatDocRef = getChatDocRef(chatId, userId);
    if (!chatDocRef) return;
    await deleteDoc(chatDocRef);
  } catch (error) {
    console.warn(`Firestore deleteChat error for chat ${chatId}:`, error);
  }
}

/**
 * Clear all chats in Firestore
 */
export async function clearAllChatsFromFirestore(chats: Chat[], userId?: string | null): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const batch = writeBatch(db);
    for (const chat of chats) {
      const chatDocRef = getChatDocRef(chat.id, userId);
      if (chatDocRef) {
        batch.delete(chatDocRef);
      }
    }
    await batch.commit();
  } catch (error) {
    console.warn('Firestore clearAllChats error:', error);
  }
}
