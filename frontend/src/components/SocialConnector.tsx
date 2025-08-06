// File: frontend/src/components/SocialConnector.tsx
// Developer: Gemini (Experienced Developer)
// Version: 3.1 - Restored Connection Status UI

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Linkedin, Twitter, AlertCircle, LogOut, Share2, Smile, Paperclip, XCircle, CheckCircle, PlusCircle, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// --- Configuration ---
const LINKEDIN_CHAR_LIMIT = 3000;
const TWITTER_CHAR_LIMIT = 280;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function SocialConnector() {
  // --- Main content state for LinkedIn & single tweets ---
  const [content, setContent] = useState("");
  
  // --- State for Manual Thread tweets ---
  const [threadTweets, setThreadTweets] = useState<{id: number, text: string}[]>([{ id: 1, text: "" }]);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [postingPlatform, setPostingPlatform] = useState<'linkedin' | 'twitter' | 'both' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [linkedinToken, setLinkedinToken] = useState<string | null>(null);
  const [twitterToken, setTwitterToken] = useState<string | null>(null);
  const [isThreadMode, setIsThreadMode] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);


  // --- Token & Authentication Logic (No changes) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinTokenFromUrl = params.get('linkedin_token');
    const twitterTokenFromUrl = params.get('twitter_token');
    const error = params.get('error');

    if (linkedinTokenFromUrl) {
      setLinkedinToken(linkedinTokenFromUrl);
      localStorage.setItem('linkedin_access_token', linkedinTokenFromUrl);
      toast({ title: "Success!", description: "LinkedIn account connected." });
      navigate("/", { replace: true });
    }
    if (twitterTokenFromUrl) {
      setTwitterToken(twitterTokenFromUrl);
      localStorage.setItem('twitter_access_token', twitterTokenFromUrl);
      toast({ title: "Success!", description: "Twitter account connected." });
      navigate("/", { replace: true });
    }
    if (error) {
      const serviceName = error.split('_')[0] || 'The service';
      toast({ title: "Connection Failed", description: `Login with ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} failed.`, variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [toast, navigate]);

  useEffect(() => {
    const storedLinkedinToken = localStorage.getItem('linkedin_access_token');
    if (storedLinkedinToken) setLinkedinToken(storedLinkedinToken);
    
    const storedTwitterToken = localStorage.getItem('twitter_access_token');
    if (storedTwitterToken) setTwitterToken(storedTwitterToken);
  }, []);

  // --- Click outside handler for Emoji Picker (No changes) ---
   useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef]);

  // --- Derived State ---
  const isAnyTweetOverLimit = threadTweets.some(tweet => tweet.text.length > TWITTER_CHAR_LIMIT);
  const isThreadEmpty = threadTweets.every(tweet => tweet.text.trim() === "");
  const combinedThreadTextForLinkedin = threadTweets.map(t => t.text).join('\n\n');
  const isLinkedinOverLimit = (isThreadMode ? combinedThreadTextForLinkedin.length : content.length) > LINKEDIN_CHAR_LIMIT;

  // --- Handlers for Manual Thread ---
  const addTweetInput = () => {
    setThreadTweets(prev => [...prev, { id: Date.now(), text: "" }]);
  };

  const removeTweetInput = (id: number) => {
    if (threadTweets.length > 1) {
      setThreadTweets(prev => prev.filter(tweet => tweet.id !== id));
    }
  };

  const updateTweetText = (id: number, newText: string) => {
    setThreadTweets(prev => prev.map(tweet => tweet.id === id ? { ...tweet, text: newText } : tweet));
  };
  
  const onEmojiClick = (emojiObject: EmojiClickData, tweetId?: number) => {
    if (isThreadMode && tweetId) {
      const targetTweet = threadTweets.find(t => t.id === tweetId);
      if(targetTweet) {
        updateTweetText(tweetId, targetTweet.text + emojiObject.emoji);
      }
    } else {
      setContent(prevContent => prevContent + emojiObject.emoji);
    }
    setShowEmojiPicker(null);
  };
  
  // --- Other UI Handlers ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ title: "Invalid File", description: "Please select an image or video file.", variant: "destructive" });
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      if (isThreadMode) {
          toast({ title: "Heads up!", description: "Media is only supported for LinkedIn posts, not Twitter threads."})
      }
    }
  };
  
  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleLogin = (platform: 'linkedin' | 'twitter') => {
    window.location.href = `${API_BASE_URL}/api/${platform}/auth`;
  };
  
  const handleLogout = (platform: 'linkedin' | 'twitter') => {
    if (platform === 'linkedin') {
      setLinkedinToken(null);
      localStorage.removeItem('linkedin_access_token');
      toast({ title: "Disconnected from LinkedIn" });
    }
    if (platform === 'twitter') {
      setTwitterToken(null);
      localStorage.removeItem('twitter_access_token');
      toast({ title: "Disconnected from Twitter" });
    }
  };

  // --- Main Post Handler ---
  const handlePost = async (platform: 'linkedin' | 'twitter' | 'both') => {
    const isMainContentEmpty = isThreadMode ? isThreadEmpty : !content.trim();
    if (isMainContentEmpty && !mediaFile) {
        toast({ title: "Content Required", description: "Please enter some content or add a file to post.", variant: "destructive" });
        return;
    }

    setPostingPlatform(platform);

    const createFormData = (token: string, platformName: 'linkedin' | 'twitter') => {
        const formData = new FormData();
        formData.append('accessToken', token);

        if (platformName === 'twitter' && isThreadMode) {
            const tweets = threadTweets.map(t => t.text).filter(t => t.trim() !== '');
            formData.append('tweets', JSON.stringify(tweets));
        } else {
            const contentForPost = isThreadMode ? combinedThreadTextForLinkedin : content;
            formData.append('content', contentForPost);
            if (mediaFile) {
                formData.append('media', mediaFile);
            }
        }
        return formData;
    };

    const postToPlatform = async (platformName: 'linkedin' | 'twitter', token: string | null) => {
        if (!token) throw new Error(`${platformName.charAt(0).toUpperCase() + platformName.slice(1)} is not connected.`);
        const response = await fetch(`${API_BASE_URL}/api/${platformName}/post`, {
            method: 'POST',
            body: createFormData(token, platformName),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.details || `Failed to post to ${platformName}.`);
        }
    };

    try {
      const postPromises = [];
      let successPlatforms = [];

      if (platform === 'linkedin' || platform === 'both') {
          if (isLinkedinOverLimit) throw new Error("Post is too long for LinkedIn.");
          postPromises.push(postToPlatform('linkedin', linkedinToken).then(() => successPlatforms.push("LinkedIn")));
      }
      if (platform === 'twitter' || platform === 'both') {
          if (isThreadMode) {
              if (isAnyTweetOverLimit) throw new Error("One or more tweets in your thread is over the character limit.");
              if (isThreadEmpty) throw new Error("Cannot post an empty thread.");
          } else {
              if (content.length > TWITTER_CHAR_LIMIT) throw new Error("Post is too long for a single Tweet.");
          }
          postPromises.push(postToPlatform('twitter', twitterToken).then(() => successPlatforms.push("Twitter")));
      }
      
      await Promise.all(postPromises);

      if (successPlatforms.length > 0) {
        toast({ title: "Success!", description: `Posted successfully to ${successPlatforms.join(' & ')}.` });
      }
      
      setContent("");
      setThreadTweets([{ id: 1, text: "" }]);
      removeMedia();

    } catch (error: any) {
        toast({ title: "Posting Failed", description: error.message, variant: "destructive" });
    } finally {
        setPostingPlatform(null);
    }
  };
  
  const canPostToBoth = linkedinToken && twitterToken && !isLinkedinOverLimit && (!isThreadMode || !isAnyTweetOverLimit) && ((isThreadMode && !isThreadEmpty) || (!isThreadMode && (content.trim() !== "" || mediaFile !== null)));

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* --- RESTORED: HEADER SECTION --- */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Social Media Crossposter
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Write once, post everywhere. Connect your accounts to get started.
            </p>
          </div>

          {/* --- RESTORED: CONNECTION STATUS SECTION --- */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Connection Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={linkedinToken ? "border-green-400" : "border-gray-300"}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><Linkedin className={`h-8 w-8 ${linkedinToken ? 'text-linkedin' : 'text-gray-400'}`} /><div><p className="font-bold">LinkedIn</p>{linkedinToken ? (<span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />Connected</span>) : (<span className="flex items-center gap-1 text-sm text-gray-500"><AlertCircle className="h-4 w-4" />Not Connected</span>)}</div></div>
                  {linkedinToken ? (<Button onClick={() => handleLogout('linkedin')} variant="outline" size="sm" className="gap-2"><LogOut className="h-4 w-4" />Logout</Button>) : (<Button onClick={() => handleLogin('linkedin')} className="gap-2 bg-linkedin hover:bg-linkedin/90 text-white"><Linkedin className="h-4 w-4" />Connect</Button>)}
                </CardContent>
              </Card>
              <Card className={twitterToken ? "border-green-400" : "border-gray-300"}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><Twitter className={`h-8 w-8 ${twitterToken ? 'text-twitter' : 'text-gray-400'}`} /><div><p className="font-bold">Twitter</p>{twitterToken ? (<span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />Connected</span>) : (<span className="flex items-center gap-1 text-sm text-gray-500"><AlertCircle className="h-4 w-4" />Not Connected</span>)}</div></div>
                  {twitterToken ? (<Button onClick={() => handleLogout('twitter')} variant="outline" size="sm" className="gap-2"><LogOut className="h-4 w-4" />Logout</Button>) : (<Button onClick={() => handleLogin('twitter')} className="gap-2 bg-twitter hover:bg-twitter/90 text-white"><Twitter className="h-4 w-4" />Connect</Button>)}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card className="shadow-lg dark:shadow-primary/10">
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Compose Post</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative space-y-3">
                <Textarea 
                  placeholder={isThreadMode ? "The combined thread text will appear here for the LinkedIn post." : "What's on your mind?..."} 
                  value={isThreadMode ? combinedThreadTextForLinkedin : content} 
                  onChange={(e) => !isThreadMode && setContent(e.target.value)} 
                  className="min-h-[140px] resize-none" 
                  disabled={isThreadMode || (!linkedinToken && !twitterToken)}
                />
                {mediaPreview && (<div className="relative w-36 h-36 border p-1 rounded-lg">{mediaFile?.type.startsWith('video/') ? (<video src={mediaPreview} className="rounded-md object-cover w-full h-full" controls />) : (<img src={mediaPreview} alt="Preview" className="rounded-md object-cover w-full h-full" />)}<Button onClick={removeMedia} variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"><XCircle className="h-5 w-5" /></Button></div>)}
              </div>
              
              <div className="flex items-center justify-between border-t pt-3">
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Attach Media" onClick={() => fileInputRef.current?.click()} disabled={!linkedinToken && !twitterToken}><Paperclip className="h-5 w-5" /></Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                    <div className="relative" ref={emojiPickerRef}>
                      <Button variant="ghost" size="icon" title="Add Emoji to Main Post" onClick={() => setShowEmojiPicker(p => p === 0 ? null : 0)} disabled={isThreadMode || (!linkedinToken && !twitterToken)}><Smile className="h-5 w-5" /></Button>
                      {showEmojiPicker === 0 && (<div className="absolute z-10 mt-2"><EmojiPicker onEmojiClick={(e) => onEmojiClick(e)} /></div>)}
                    </div>
                 </div>
                 {isThreadMode && <p className="text-xs text-blue-500">Thread mode on. Media is supported for LinkedIn.</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <Card className={`transition-all ${!linkedinToken ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-linkedin"><Linkedin className="h-5 w-5" />LinkedIn Post</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white dark:bg-black/20 rounded-lg p-3 min-h-[150px] border">
                      <p className="text-sm whitespace-pre-wrap break-words">{ (isThreadMode ? combinedThreadTextForLinkedin : content) || "Your LinkedIn text will appear here..."}</p>
                      {mediaPreview && <img src={mediaPreview} alt="Media Preview" className="mt-2 rounded-lg w-full object-cover" />}
                    </div>
                    <Badge variant={isLinkedinOverLimit ? "destructive" : "secondary"}>{isThreadMode ? combinedThreadTextForLinkedin.length : content.length}/{LINKEDIN_CHAR_LIMIT}</Badge>
                    <Button onClick={() => handlePost('linkedin')} disabled={postingPlatform !== null || ((isThreadMode ? !combinedThreadTextForLinkedin.trim() : !content.trim()) && !mediaFile) || isLinkedinOverLimit || !linkedinToken}>
                       Post to LinkedIn
                    </Button>
                  </CardContent>
                </Card>

                <Card className={`transition-all ${!twitterToken ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-center">
                       <CardTitle className="flex items-center gap-2 text-lg text-twitter"><Twitter className="h-5 w-5" />Twitter Post</CardTitle>
                       {twitterToken && (
                         <div className="flex items-center space-x-2">
                           <Label htmlFor="thread-mode" className="text-sm font-medium">Create a Thread</Label>
                           <Switch id="thread-mode" checked={isThreadMode} onCheckedChange={setIsThreadMode} />
                         </div>
                       )}
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-4">
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {isThreadMode ? (
                        <>
                          {threadTweets.map((tweet, index) => (
                            <div key={tweet.id} className="p-3 rounded-lg border bg-white dark:bg-black/20 relative group">
                              <Textarea placeholder={`Tweet ${index + 1}/${threadTweets.length}...`} value={tweet.text} onChange={(e) => updateTweetText(tweet.id, e.target.value)} className="resize-none border-0 !ring-0 !outline-none p-0 bg-transparent"/>
                              <div className="flex justify-between items-center mt-2">
                                <div className="relative" ref={emojiPickerRef}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEmojiPicker(p => p === tweet.id ? null : tweet.id)}><Smile className="h-4 w-4" /></Button>
                                  {showEmojiPicker === tweet.id && (<div className="absolute z-10 mt-2"><EmojiPicker onEmojiClick={(e) => onEmojiClick(e, tweet.id)} /></div>)}
                                </div>
                                <Badge variant={tweet.text.length > TWITTER_CHAR_LIMIT ? 'destructive' : 'secondary'}>{tweet.text.length}/{TWITTER_CHAR_LIMIT}</Badge>
                                {threadTweets.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 opacity-50 group-hover:opacity-100" onClick={() => removeTweetInput(tweet.id)}><Trash2 className="h-4 w-4"/></Button>}
                              </div>
                            </div>
                          ))}
                           <Button onClick={addTweetInput} variant="outline" className="w-full gap-2"><PlusCircle className="h-4 w-4" /> Add Tweet to Thread</Button>
                        </>
                      ) : (
                        <div className="bg-white dark:bg-black/20 rounded-lg p-3 min-h-[150px] border">
                            <p className="text-sm whitespace-pre-wrap break-words">{content || "Your tweet text will appear here..."}</p>
                            {mediaPreview && <img src={mediaPreview} alt="Media Preview" className="mt-2 rounded-lg w-full object-cover" />}
                        </div>
                      )}
                    </div>
                    {!isThreadMode && <Badge variant={content.length > TWITTER_CHAR_LIMIT ? "destructive" : "secondary"} className="w-full justify-center py-1">{content.length}/{TWITTER_CHAR_LIMIT}</Badge>}
                    <Button onClick={() => handlePost('twitter')} disabled={postingPlatform !== null || !twitterToken || (isThreadMode ? isThreadEmpty || isAnyTweetOverLimit : !content.trim() && !mediaFile)}>
                      {postingPlatform === 'twitter' ? "Posting..." : isThreadMode ? 'Post Thread to Twitter' : 'Post to Twitter'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-6 border-t">
                <Button onClick={() => handlePost('both')} disabled={postingPlatform !== null || !canPostToBoth} className="w-full bg-gradient-to-r from-linkedin via-primary to-twitter text-white text-base py-6 disabled:opacity-50">
                   {postingPlatform === 'both' ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />Posting to Both...</> : <><Share2 className="h-5 w-5 mr-3" />Post to Both Platforms</>}
                </Button>
                {(!linkedinToken || !twitterToken) && <p className="text-xs text-center text-gray-500 mt-2">Connect both accounts to enable this option.</p>}
                {linkedinToken && twitterToken && !canPostToBoth && <p className="text-xs text-center text-red-500 mt-2">Content may be empty or over the character limit for one or more platforms.</p>}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}