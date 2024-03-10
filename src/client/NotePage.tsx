import React, { useCallback, useState, useEffect, useRef } from 'react';
import { produce } from 'immer';
import type * as t from '../common/types.js';
import * as storage from './storage.js';
import * as appStore from './appStore.js';
import * as util from './util.jsx';
import * as actions from './appStoreActions.jsx';
import Editor from './Editor.jsx';
import { PageLayout, PageHeader, PageBody, PageAction } from './PageLayout.jsx';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { LoaderFunctionArgs, useLoaderData, useNavigate, useLocation } from 'react-router-dom';

export function NotePage() {
  const app = appStore.use();
  const [note, setNote] = useState(useLoaderData() as t.Note | undefined);
  const navigate = useNavigate();
  const location = useLocation();
  // const app = appStore.use();

  util.useScrollToTop();

  const goHome = useCallback(() => {
    if (location.state?.fromNotesPage) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const textChangeCb = useCallback((text: string) => setNote(note => ({ ...note!, text })), []);
  const saveCb = useCallback(() => {
    actions.saveNote({ ...note!, modification_date: new Date().toISOString() }, 'saved');
  }, [note]);
  const archiveCb = useCallback(() => {
    actions
      .saveNote({ ...note!, modification_date: new Date().toISOString(), not_archived: 0 }, 'archived')
      .then(goHome);
  }, [goHome, note]);
  const pinCb = useCallback(() => {
    const newNote = { ...note!, modification_date: new Date().toISOString(), pinned: note!.pinned ? 0 : 1 };
    actions.saveNote(newNote, note!.pinned ? 'unpinned' : 'pinned').then(() => setNote(newNote));
  }, [note]);
  const deleteCb = useCallback(() => {
    if (confirm('Are you sure you want to delete this note?')) {
      actions
        .saveNote({ ...note!, modification_date: new Date().toISOString(), text: null, not_deleted: 0 }, 'deleted')
        .then(goHome);
    }
  }, [goHome, note]);

  const pageActions = note && [
    <PageAction icon="/icons/trash-white.svg" onClick={deleteCb} />,
    <PageAction icon="/icons/archive-white.svg" onClick={archiveCb} />,
    <PageAction icon={note.pinned ? '/icons/pin-filled-white.svg' : '/icons/pin-empty-white.svg'} onClick={pinCb} />,
    <PageAction icon="/icons/check-white.svg" onClick={saveCb} />,
  ];

  return (
    <PageLayout>
      <PageHeader actions={pageActions} />
      <PageBody>
        <div className="note-page">
          {!note && app.syncing && <h2 className="page-message">Loading...</h2>}
          {!note && !app.syncing && <h2 className="page-message">Not found</h2>}
          {note && (
            <div className="note-container">
              <Editor
                id="note-editor"
                className="text-input"
                placeholder="What's on you mind?"
                value={note.text ?? ''}
                onChange={textChangeCb}
              />
            </div>
          )}
        </div>
      </PageBody>
    </PageLayout>
  );
}

export async function notePageLoader({ params }: LoaderFunctionArgs): Promise<t.Note | null> {
  if (storage.syncing) await storage.waitTillSyncEnd(5000);
  return (await storage.getNote(params.noteId as string)) ?? null;
}
