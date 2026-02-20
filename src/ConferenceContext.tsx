import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

export interface ConferenceConfig {
  id: string;
  name: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

interface ConferenceContextType {
  conferenceId: string | null;
  tabId: string | null;
  conference: ConferenceConfig | null;
  isAdmin: boolean; // Conference-specific admin
  groups: string[]; // Conference-specific groups
  loading: boolean;
  error: string | null;
}

const ConferenceContext = createContext<ConferenceContextType | undefined>(undefined);

export function ConferenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conferenceId, setConferenceId] = useState<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);
  const [conference, setConference] = useState<ConferenceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/c\/([^/]+)(?:\/([^/]+))?/);
      return {
        slug: match ? match[1] : null,
        tab: match ? match[2] : null
      };
    };

    const { slug, tab } = parseUrl();
    setConferenceId(slug);
    setTabId(tab);

    if (slug) {
      const fetchConference = async () => {
        try {
          const confRef = doc(db, 'conferences', slug);
          const confDoc = await getDoc(confRef);
          
          if (confDoc.exists()) {
            const data = confDoc.data();
            setConference({
              id: slug,
              name: data.name || 'Untitled Conference',
              startDate: data.startDate || new Date().toISOString(),
              endDate: data.endDate || new Date().toISOString(),
            });
          } else {
            setError(`Conference "${slug}" not found.`);
          }
        } catch (err) {
          console.error('Error fetching conference:', err);
          setError('Failed to load conference data.');
        } finally {
          setLoading(false);
        }
      };

      fetchConference();
    } else {
      setLoading(false);
    }
  }, []);

  // Use a second effect to handle roles for a logged-in user in the current conference
  useEffect(() => {
    if (!user || !conferenceId) {
      setIsAdmin(false);
      setGroups([]);
      return;
    }

    const roleRef = doc(db, 'conferences', conferenceId, 'roles', user.uid);
    const unsubscribe = onSnapshot(roleRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsAdmin(data.isAdmin === true);
        setGroups(data.groups || []);
      } else {
        setIsAdmin(false);
        setGroups([]);
      }
    });

    return () => unsubscribe();
  }, [user, conferenceId]);

  const value = {
    conferenceId,
    tabId,
    conference,
    isAdmin,
    groups,
    loading,
    error,
  };

  return <ConferenceContext.Provider value={value}>{children}</ConferenceContext.Provider>;
}

export function useConference() {
  const context = useContext(ConferenceContext);
  if (context === undefined) {
    throw new Error('useConference must be used within a ConferenceProvider');
  }
  return context;
}
