"use client";

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, Play, Download, Trash2, CheckSquare, Square,
  Settings2, Key, Save, Edit3, Image as ImageIcon,
  ChevronDown, ChevronUp, XCircle, CheckCircle2, AlertTriangle, X, StopCircle,
  AlertCircle, Copy, Maximize2
} from 'lucide-react';
import Logo from '@/components/Logo';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

const DEFAULT_CONFIG = {
  aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  requestDelay: 1000,
};

export default function Page() {
  const [cookieInput, setCookieInput] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [tokenStatus, setTokenStatus] = useState('idle');
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('img_gen_config');
      if (saved) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        } catch (e) {
          console.error("Failed to parse config", e);
        }
      }
    }
    return DEFAULT_CONFIG;
  });

  const [promptsInput, setPromptsInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genStats, setGenStats] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);

  const stopProcessingRef = useRef(false);

  useEffect(() => {
    const savedDataStr = localStorage.getItem('img_gen_session_data');
    if (savedDataStr) {
      try {
        const data = JSON.parse(savedDataStr);
        if (data.token) {
          setSessionToken(data.token);
          setTokenExpiry(data.expiry);
          setIsConfigSaved(true);
          validateTokenStatus(data.expiry);
        }
      } catch (e) {
        localStorage.removeItem('img_gen_session_data');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('img_gen_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (!tokenExpiry) return;
    const interval = setInterval(() => validateTokenStatus(tokenExpiry), 30000);
    return () => clearInterval(interval);
  }, [tokenExpiry]);

  const validateTokenStatus = (expiryMs) => {
    if (!expiryMs) { setTokenStatus('valid'); return; }
    const delta = 5 * 60 * 1000;
    setTokenStatus(Date.now() + delta > expiryMs ? 'expired' : 'valid');
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSession = () => {
    if (!cookieInput?.trim()) return toast.error("Please paste the cookie JSON array.");
    try {
      const cookies = JSON.parse(cookieInput);
      if (!Array.isArray(cookies)) throw new Error("Not an array");
      const target = cookies.find(c => c.name === '__Secure-next-auth.session-token' || c.name === 'next-auth.session-token');
      if (!target) {
        setTokenStatus('missing');
        return toast.error("Session token not found in JSON.");
      }
      const expiry = target.expirationDate ? target.expirationDate * 1000 : null;
      const data = { token: target.value, expiry };

      localStorage.setItem('img_gen_session_data', JSON.stringify(data));
      setSessionToken(target.value);
      setTokenExpiry(expiry);
      validateTokenStatus(expiry);
      setIsConfigSaved(true);
      setCookieInput('');
      toast.success("Session updated!");
    } catch (e) {
      toast.error("Invalid JSON format.");
    }
  };

  const handleClearSession = () => {
    localStorage.removeItem('img_gen_session_data');
    setSessionToken(null);
    setTokenExpiry(null);
    setTokenStatus('idle');
    setIsConfigSaved(false);
  };

  const handleStop = () => {
    stopProcessingRef.current = true;
    toast("Stopping after current task...", { icon: '🛑' });
  };

  const handleGenerate = async () => {
    if (!isConfigSaved || !sessionToken) {
      toast.error("Configure session first.");
      setIsConfigOpen(true);
      return;
    }
    if (tokenStatus === 'expired') return toast.error("Session expired.");

    const rawPrompts = promptsInput.split('---').map(p => p.trim()).filter(p => p.length > 0);
    if (rawPrompts.length === 0) return toast.error("Enter at least one prompt.");

    setIsGenerating(true);
    setProgress(0);
    stopProcessingRef.current = false;

    const totalTasks = rawPrompts.length;
    let completedTasks = 0;
    setGenStats({ done: 0, total: totalTasks });

    for (let i = 0; i < rawPrompts.length; i++) {
      if (stopProcessingRef.current) break;
      const basePrompt = rawPrompts[i];

      const batchId = Date.now().toString() + Math.random().toString().slice(2, 6);

      setResults(prev => [{
        id: batchId,
        type: 'loading',
        prompt: basePrompt,
        selected: false
      }, ...prev]);

      try {
        const payload = {
          prompt: basePrompt,
          token: sessionToken,
          aspectRatio: config.aspectRatio
        };

        const response = await fetch("/api/generate", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          if (response.status === 401) setTokenStatus('expired');

          let errorMsg = `Failed to generate image! Error: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData?.detail) {
              errorMsg = errorData.detail;
            }
          } catch (e) { }
          throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.imagePanels?.[0]?.generatedImages) {
          const newImages = data.imagePanels[0].generatedImages.map((img, idx) => ({
            id: `${batchId}-${idx}`,
            type: 'image',
            url: `data:image/jpeg;base64,${img.encodedImage}`,
            prompt: img.prompt || basePrompt,
            aspect: img.aspectRatio,
            seed: img.seed,
            model: img.imageModel,
            selected: false
          }));

          setResults(prev => {
            const idx = prev.findIndex(item => item.id === batchId);
            if (idx === -1) return [...newImages, ...prev];
            const newArr = [...prev];
            newArr.splice(idx, 1, ...newImages);
            return newArr;
          });
        } else {
          throw new Error("No images in response");
        }

      } catch (error) {
        console.error(error);
        setResults(prev => prev.map(item =>
          item.id === batchId
            ? { ...item, type: 'error', error: error.message || "Failed" }
            : item
        ));
      }

      completedTasks++;
      setProgress((completedTasks / totalTasks) * 100);
      setGenStats({ done: completedTasks, total: totalTasks });

      if (i < rawPrompts.length - 1 && !stopProcessingRef.current) {
        await new Promise(resolve => setTimeout(resolve, config.requestDelay));
      }
    }

    setIsGenerating(false);
    stopProcessingRef.current = false;
    if (completedTasks === totalTasks) toast.success("Queue finished.");
  };

  const toggleSelection = (id) => setResults(prev => prev.map(img => (img.type === 'image' && img.id === id) ? { ...img, selected: !img.selected } : img));

  const handleSelectAll = (select) => setResults(prev => prev.map(img => img.type === 'image' ? { ...img, selected: select } : img));

  const deleteSelected = () => setResults(prev => prev.filter(img => !img.selected));

  const clearErrors = () => {
    setResults(prev => prev.filter(item => item.type !== 'error'));
    toast.success("Errors cleared");
  };

  const removeCard = (id) => setResults(prev => prev.filter(item => item.id !== id));

  const downloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSelected = async () => {
    const selected = results.filter(img => img.selected && img.type === 'image');
    if (selected.length === 0) return toast.error("No images selected.");
    const toastId = toast.loading(`Downloading ${selected.length} images...`);
    for (let i = 0; i < selected.length; i++) {
      await new Promise(r => setTimeout(r, 200));
      downloadImage(selected[i].url, `gen-${selected[i].id.slice(0, 8)}.jpg`);
    }
    toast.success("Done", { id: toastId });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusColor = () => {
    if (tokenStatus === 'valid') return 'text-green-600 dark:text-green-400';
    if (tokenStatus === 'expired') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <>
      <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {isGenerating && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span className="animate-pulse text-primary">
                  Processing Queue... ({genStats.done}/{genStats.total})
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-4 space-y-6">
              <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <Card className={`transition-colors duration-300 ${sessionToken ? (tokenStatus === 'valid' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : ''}`}>
                  <CardHeader className="py-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer group">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings2 className="w-4 h-4" /> Configuration
                        </CardTitle>
                        {isConfigOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent className="pb-3">
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-4 rounded-lg bg-background/50 p-4 border border-border/50">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2"><Key className="w-4 h-4" /> Session</Label>
                          <div className={`flex items-center gap-1.5 text-[10px] font-medium border px-2 py-0.5 rounded-full bg-background ${getStatusColor()}`}>
                            {tokenStatus === 'valid' && isConfigSaved && <CheckCircle2 className="w-3 h-3" />}
                            {tokenStatus === 'expired' && <AlertTriangle className="w-3 h-3" />}
                            {!sessionToken && <XCircle className="w-3 h-3" />}
                            {sessionToken ? (tokenStatus === 'valid' ? 'Active' : 'Expired') : 'Required'}
                          </div>
                        </div>

                        {isConfigSaved ? (
                          <div className="space-y-3 animate-in fade-in">
                            <div className="text-xs bg-background p-3 rounded-md border border-border space-y-2">
                              <div className="flex justify-between items-center pb-2 border-b border-dashed">
                                <span className="text-muted-foreground">Status</span>
                                <span className={`font-bold ${tokenStatus === 'valid' ? 'text-green-600' : 'text-red-500'}`}>{tokenStatus.toUpperCase()}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-muted-foreground">Expires</span>
                                <span className="font-mono text-[10px]">{tokenExpiry ? new Date(tokenExpiry).toLocaleString() : 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => setIsConfigSaved(false)}><Edit3 className="w-3 h-3 mr-2" /> Update</Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={handleClearSession}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 animate-in fade-in">
                            <Textarea placeholder="Paste cookie JSON..." value={cookieInput} onChange={e => setCookieInput(e.target.value)} className="font-mono text-[10px] h-32 resize-none" />
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1" onClick={handleSaveSession}><Save className="w-4 h-4 mr-2" /> Save</Button>
                              {sessionToken && <Button size="sm" variant="outline" onClick={() => setIsConfigSaved(true)}><X className="w-4 h-4" /></Button>}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Aspect Ratio</Label>
                          <Select value={config.aspectRatio} onValueChange={(v) => updateConfig('aspectRatio', v)} disabled={isGenerating}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IMAGE_ASPECT_RATIO_LANDSCAPE">Horizontal (16:9)</SelectItem>
                              <SelectItem value="IMAGE_ASPECT_RATIO_PORTRAIT">Vertical (9:16)</SelectItem>
                              <SelectItem value="IMAGE_ASPECT_RATIO_SQUARE">Square (1:1)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center">
                            <Label>Request Delay</Label>
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {config.requestDelay}ms
                            </span>
                          </div>
                          <Slider
                            min={100}
                            max={5000}
                            step={100}
                            value={[config.requestDelay]}
                            onValueChange={(val) => updateConfig('requestDelay', val[0])}
                            disabled={isGenerating}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Prompts</Label>
                  <Badge variant="outline" className="font-mono text-[10px]">Split: ---</Badge>
                </div>
                <Textarea
                  placeholder={`Prompt 1\n---\nPrompt 2`}
                  className="min-h-50 max-h-100 font-mono text-sm"
                  value={promptsInput}
                  onChange={(e) => setPromptsInput(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              {isGenerating ? (
                <Button size="lg" variant="destructive" className="w-full" onClick={handleStop}>
                  <StopCircle className="w-5 h-5 mr-2 animate-pulse" /> Stop Processing
                </Button>
              ) : (
                <Button size="lg" className="w-full" onClick={handleGenerate}>
                  <Play className="w-5 h-5 mr-2" /> Start Generating
                </Button>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col h-full min-h-125">
              <div className="flex items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm mb-4 sticky top-4 z-10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={results.some(r => r.type === 'image') && results.filter(r => r.type === 'image').every(r => r.selected)}
                      onCheckedChange={handleSelectAll}
                      disabled={!results.some(r => r.type === 'image')}
                    />
                    <Label htmlFor="select-all">Select All</Label>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:inline-block">
                    {results.filter(r => r.selected).length} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  {results.some(r => r.type === 'error') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearErrors}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Clear Errors</span>
                    </Button>
                  )}
                  {results.some(r => r.selected) && (
                    <Button variant="destructive" size="sm" onClick={deleteSelected}><Trash2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Delete</span></Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleDownloadSelected} disabled={!results.some(r => r.selected)}>
                    <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl p-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                  <p>No images yet. Start generating!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-muted/30 transition-all ${item.selected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted'
                        } cursor-pointer group`}
                      onClick={() => item.type === 'image' && toggleSelection(item.id)}
                    >
                      {item.type === 'loading' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-default">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                          <span className="text-xs text-muted-foreground animate-pulse">Generating...</span>
                          <p className="text-[10px] text-muted-foreground/50 mt-2 line-clamp-2 px-2">{item.prompt}</p>
                        </div>
                      )}

                      {item.type === 'error' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-red-500/5 cursor-default">
                          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">Failed</span>
                          <p className="text-[10px] text-red-500/80 mt-1 line-clamp-3 break-all">{item.error}</p>
                          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={(e) => { e.stopPropagation(); removeCard(item.id); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {item.type === 'image' && (
                        <>
                          <img
                            src={item.url}
                            alt="Gen"
                            className="w-full h-full object-contain bg-black/5 dark:bg-black/40 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2 z-10">
                            <div className={`w-6 h-6 rounded flex items-center justify-center shadow-sm transition-colors ${item.selected ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-muted-foreground'
                              }`}>
                              {item.selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>
                          </div>

                          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full shadow-md bg-background/80 hover:bg-background"
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(item); }}
                            >
                              <Maximize2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent p-3 pt-10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end pointer-events-none">
                            <p className="text-white text-xs truncate flex-1 mr-2">{item.prompt}</p>
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shrink-0 pointer-events-auto" onClick={(e) => { e.stopPropagation(); downloadImage(item.url, `gen-${item.id.slice(0, 8)}.jpg`); }}>
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
            <div className="bg-background border border-border rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

              <div className="flex-1 bg-black/90 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-border">
                <div className="relative aspect-square w-full max-w-125 flex items-center justify-center bg-black/50 rounded-lg overflow-hidden border border-white/10 shadow-lg group">
                  <img src={previewImage.url} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={() => downloadImage(previewImage.url, `gen-${previewImage.id}.jpg`)}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-96 bg-card flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Image Details</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewImage(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Prompt</Label>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(previewImage.prompt)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed p-3 bg-muted/50 rounded-md border text-foreground/90 font-medium">
                        {previewImage.prompt}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Aspect Ratio</Label>
                        <div className="text-sm font-mono p-2 bg-muted/30 rounded border truncate" title={previewImage.aspect}>
                          {previewImage.aspect?.replace('IMAGE_ASPECT_RATIO_', '') || 'N/A'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Model</Label>
                        <div className="text-sm font-mono p-2 bg-muted/30 rounded border truncate">
                          {previewImage.model || 'Unknown'}
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Seed</Label>
                        <div className="text-sm font-mono p-2 bg-muted/30 rounded border flex justify-between items-center group">
                          <span className="truncate">{previewImage.seed ?? 'Random'}</span>
                          {previewImage.seed !== undefined && (
                            <Copy className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(String(previewImage.seed))} />
                          )}
                        </div>
                      </div>
                    </div>

                    {previewImage.type === 'image' && (
                      <div className="pt-4 border-t">
                        <Button className="w-full" variant="outline" onClick={() => {
                          setPromptsInput(previewImage.prompt);
                          setPreviewImage(null);
                          toast.success("Prompt loaded to editor");
                        }}>
                          <Maximize2 className="w-4 h-4 mr-2" /> Reuse Prompt
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
      <Logo />
    </>
  );
}