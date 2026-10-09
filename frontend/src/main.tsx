import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderEditedImage } from './imageProcessor';
import type { EditingRecipe, RecipeResponse } from './types';
import './style.css';

const examples = [
  { label: 'Warm sunset', prompt: 'Warm cinematic sunset, but keep the colors natural.' },
  { label: 'Rainy mood', prompt: 'Cool, moody, rainy-day photography with muted color and lifted shadows.' },
  { label: 'Summer film', prompt: 'Bright, vibrant summer film look with warm light and soft shadows.' },
  { label: 'Airy portrait', prompt: 'Airy high-key portrait, soft contrast, glowing highlights, warm skin tones.' },
  { label: 'Vintage film', prompt: 'Faded vintage film: warm color, matte contrast, lifted shadows, subtle vignette.' },
  { label: 'Editorial', prompt: 'Clean editorial look with neutral color, crisp contrast, and bright highlights.' },
  { label: 'Autumn color', prompt: 'Rich autumn foliage, warm amber tones, deep shadows, and lively color.' },
  { label: 'Blue hour', prompt: 'Blue-hour city mood with cool tones, bright highlights, deep shadows, cinematic contrast.' },
];
const fields: [keyof EditingRecipe, string][] = [
  ['exposure','Exposure'],['contrast','Contrast'],['highlights','Highlights'],['shadows','Shadows'],['temperature','Temperature'],['tint','Tint'],['saturation','Saturation'],['vibrance','Vibrance'],['vignette','Vignette'],
];
function App() {
  const [original, setOriginal] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [editedUrl, setEditedUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [imageRatio, setImageRatio] = useState(4 / 3);
  const [frameMaxHeight, setFrameMaxHeight] = useState(340);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const sourceUrlRef = useRef('');
  useEffect(() => () => { if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current); }, []);
  useEffect(() => {
    const updateFrameLimit = () => {
      const viewportScale = window.innerHeight < 700 ? 0.5 : 0.58;
      setFrameMaxHeight(Math.max(180, Math.min(520, Math.round(window.innerHeight * viewportScale))));
    };
    updateFrameLimit();
    window.addEventListener('resize', updateFrameLimit);
    return () => window.removeEventListener('resize', updateFrameLimit);
  }, []);
  useEffect(() => {
    const textarea = promptRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = Math.min(180, Math.max(90, Math.round(window.innerHeight * 0.18)));
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [prompt]);
  const previewFrameStyle = { aspectRatio: imageRatio, width: `min(100%, ${Math.round(frameMaxHeight * imageRatio)}px)`, marginInline: 'auto' };

  const loadFile = useCallback((file?: File) => {
    setError(''); setResult(null); setEditedUrl('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a valid image file such as JPEG, PNG, or WebP.'); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = url; setOriginal(image); setSourceUrl(url); setFilename(file.name); setImageRatio(image.naturalWidth / image.naturalHeight); };
    image.onerror = () => { URL.revokeObjectURL(url); setError('This image could not be opened. Try a standard JPEG, PNG, or WebP photo.'); };
    image.src = url;
  }, []);

  const apply = async () => {
    if (!original) { setError('Upload a photo first.'); return; }
    if (!prompt.trim()) { setError('Describe the look you want first.'); return; }
    setBusy(true); setError('');
    try {
      // The request body deliberately contains the prompt only; image data stays in browser memory.
      const response = await fetch('/api/edit-recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'The recipe service could not complete the request.');
      const parsed = data as RecipeResponse;
      const imageUrl = renderEditedImage(original, parsed.recipe);
      setResult(parsed); setEditedUrl(imageUrl);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  const reset = () => { setEditedUrl(''); setResult(null); setError(''); };

  return <main className="app-shell">
    <section className="workspace">
      <div className="left-column">
        <div className="section-head"><div><span className="step">01</span><h2>Original</h2></div>{filename && <span className="file-name">{filename}</span>}</div>
        <div style={previewFrameStyle} className={`dropzone ${dragging ? 'dragging' : ''} ${sourceUrl ? 'has-image' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => loadFile(e.target.files?.[0])} />
          {sourceUrl ? <><img className="upload-preview" src={sourceUrl} alt="Original uploaded photo" /><span className="image-label">{editedUrl ? 'BEFORE' : 'PREVIEW'}</span></> : <div className="empty-upload"><div className="upload-icon">↑</div><strong>Drop your photo here</strong><span>or click to browse</span><small>JPEG, PNG or WebP</small></div>}
          {sourceUrl && <button className="change-photo" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>Change photo</button>}
        </div>
        <div className="prompt-card">
          <div className="section-head compact"><div><span className="step">02</span><h2>Prompt</h2></div><span className="optional">OPTIONAL</span></div>
          <div className="prompt-input-wrap">
            <textarea ref={promptRef} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!busy) apply(); } }} placeholder="Describe the edit…" maxLength={1000} />
            <button className="apply-button" disabled={busy} onClick={apply}>{busy ? <><span className="spinner"/>Applying…</> : <>Apply <span>↗</span></>}</button>
          </div>
          <div className="examples-label">EXAMPLES</div><div className="chips">{examples.map(({ label, prompt: examplePrompt }) => <button key={label} title={examplePrompt} onClick={() => setPrompt(examplePrompt)}>{label}</button>)}</div>
          {error && <div className="error-message" role="alert">{error}</div>}
        </div>
      </div>
      <div className="right-column">
        <div className="section-head"><div><span className="step">03</span><h2>Result</h2></div>{editedUrl && <button className="reset-button" onClick={reset}>↺ &nbsp;Reset</button>}</div>
        <div style={previewFrameStyle} className={`comparison ${editedUrl ? 'show-after' : ''}`}>
          {sourceUrl ? <><img src={editedUrl || sourceUrl} alt={editedUrl ? 'Edited photo' : 'Photo preview'} /><span className="image-label">{editedUrl ? 'AFTER' : 'PREVIEW'}</span></> : <div className="empty-result"><div className="sun-icon">◉</div><strong>Your edit will appear here</strong><span>Start by adding a photograph</span></div>}
        </div>
        <div className="recipe-panel">
          <div className="recipe-title"><div><span className="step">04</span><h2>Adjustments</h2></div><span className={`recipe-state ${result ? 'ready' : ''}`}><b />{result ? 'APPLIED' : 'WAITING'}</span></div>
          {result ? <>{Object.values(result.recipe).every(value => value === 0) && <p className="explanation">{result.explanation}</p>}<div className="recipe-grid">{fields.map(([key,label]) => <div className="recipe-item" key={key}><span>{label}</span><strong className={result.recipe[key] > 0 ? 'positive' : result.recipe[key] < 0 ? 'negative' : ''}>{result.recipe[key] > 0 ? '+' : ''}{result.recipe[key]}</strong></div>)}</div></> : <p className="recipe-placeholder">Your adjustments will be listed here once your edit is ready.</p>}
        </div>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
