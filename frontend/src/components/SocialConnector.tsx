import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Import Switch for the toggle
import { Label } from "@/components/ui/label";   // Import Label for the toggle
import { useToast } from "@/hooks/use-toast";
import { Send, Linkedin, Twitter, AlertCircle, LogOut, Share2, Smile, Paperclip, XCircle, CheckCircle, Rows } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// --- Configuration ---
const LINKEDIN_CHAR_LIMIT = 3000;
const TWITTER_CHAR_LIMIT = 280;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Helper Function for Thread Preview ---
const splitIntoTweets = (text: string): string[] => {
    if (!text) return [];
    
    const tweets: string[] = [];
    let currentTweet = "";

    const words = text.split(/\s+/);

    for (const word of words) {
        // Check if adding the next word exceeds the limit
        if ((currentTweet + word).length + (currentTweet ? 1 : 0) > TWITTER_CHAR_LIMIT) {
            if (currentTweet) tweets.push(currentTweet);
            currentTweet = word;
        } else {
            currentTweet = currentTweet ? `${currentTweet} ${word}` : word;
        }
    }
    // Add the last tweet
    if (currentTweet) tweets.push(currentTweet);
    
    // Add numbering (e.g., 1/n)
    if (tweets.length > 1) {
      return tweets.map((tweet, index) => {
        const number = `(${index + 1}/${tweets.length})`;
        // Check if there's enough space for the number, otherwise truncate tweet
        if (tweet.length + number.length + 1 > TWITTER_CHAR_LIMIT) {
            const truncated = tweet.substring(0, TWITTER_CHAR_LIMIT - number.length - 4) + '...';
            return `${truncated} ${number}`;
        }
        return `${tweet} ${number}`;
      });
    }

    return tweets;
};


export default function SocialConnector() {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [postingPlatform, setPostingPlatform] = useState<'linkedin' | 'twitter' | 'both' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkedinToken, setLinkedinToken] = useState<string | null>(null);
  const [twitterToken, setTwitterToken] = useState<string | null>(null);
  
  // --- NEW: State for Thread Mode ---
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
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef]);

  // --- Character Counts & Derived State ---
  const contentLen = content.length;
  const isTwitterOverLimit = !isThreadMode && contentLen > TWITTER_CHAR_LIMIT;
  const isLinkedinOverLimit = contentLen > LINKEDIN_CHAR_LIMIT;
  const threadTweets = isThreadMode ? splitIntoTweets(content) : [];

  // --- UI Handlers (Minor changes for thread mode) ---
  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setContent(prevContent => prevContent + emojiObject.emoji);
    setShowEmojiPicker(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ title: "Invalid File", description: "Please select an image or video file.", variant: "destructive" });
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));

      // --- NEW: Inform user if they attach media while thread mode is on ---
      if (isThreadMode) {
          toast({ title: "Heads up!", description: "Media can be posted to LinkedIn, but Twitter threads are text-only."})
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

  // --- Main Post Handler (UPDATED for threads) ---
  const handlePost = async (platform: 'linkedin' | 'twitter' | 'both') => {
    if (!content.trim() && !mediaFile) {
      toast({ title: "Content Required", description: "Please enter some content or add a file to post.", variant: "destructive" });
      return;
    }

    setPostingPlatform(platform);

    const createFormData = (token: string, platformName: 'linkedin' | 'twitter') => {
        const formData = new FormData();
        formData.append('content', content); // Backend will handle splitting for threads
        formData.append('accessToken', token);

        // --- UPDATED: Conditionally append media and thread flag ---
        if (platformName === 'twitter' && isThreadMode) {
            formData.append('isThread', 'true');
            // Do NOT append media for Twitter threads
        } else if (mediaFile) {
            formData.append('media', mediaFile);
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
            if (isTwitterOverLimit) throw new Error("Post is too long for a single Tweet.");
            // No length check for threads, assuming backend handles it
            postPromises.push(postToPlatform('twitter', twitterToken).then(() => successPlatforms.push("Twitter")));
        }
        
        await Promise.all(postPromises);

        if (successPlatforms.length > 1) {
            toast({ title: "Posted to All Platforms!", description: "Your content has been shared successfully." });
        } else if (successPlatforms.length === 1) {
            toast({ title: `Posted to ${successPlatforms[0]}!`, description: "Your content has been shared successfully." });
        }
        
        setContent("");
        removeMedia();
    } catch (error: any) {
        toast({ title: "Posting Failed", description: error.message, variant: "destructive" });
    } finally {
        setPostingPlatform(null);
    }
  };
  
  const canPostToBoth = linkedinToken && twitterToken && !isLinkedinOverLimit && !isTwitterOverLimit && (content.trim() !== "" || mediaFile !== null);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* 1. HEADER (No changes) */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Social Media Crossposter
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Write once, post everywhere. Connect your accounts to get started.
            </p>
          </div>

          {/* 2. CONNECTION STATUS SECTION (No changes) */}
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
          
          {/* 3. MAIN COMPOSER & PREVIEW CARD */}
          <Card className="shadow-lg dark:shadow-primary/10">
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Compose Post</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Textarea and Media Preview */}
              <div className="relative space-y-3">
                <Textarea placeholder="What's on your mind?..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[140px] resize-none border-2 focus:border-primary/50 text-base" disabled={!linkedinToken && !twitterToken}/>
                {mediaPreview && (<div className="relative w-36 h-36 border p-1 rounded-lg">{mediaFile?.type.startsWith('video/') ? (<video src={mediaPreview} className="rounded-md object-cover w-full h-full" controls />) : (<img src={mediaPreview} alt="Preview" className="rounded-md object-cover w-full h-full" />)}<Button onClick={removeMedia} variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"><XCircle className="h-5 w-5" /></Button></div>)}
              </div>
              
              {/* Toolbar for Emoji and Media */}
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-1">
                    {/* --- UPDATED: Media button is disabled in thread mode --- */}
                    <Button variant="ghost" size="icon" title="Attach Media" onClick={() => fileInputRef.current?.click()} disabled={(!linkedinToken && !twitterToken) || isThreadMode}><Paperclip className="h-5 w-5" /></Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                    <div className="relative" ref={emojiPickerRef}><Button variant="ghost" size="icon" title="Add Emoji" onClick={() => setShowEmojiPicker(p => !p)} disabled={!linkedinToken && !twitterToken}><Smile className="h-5 w-5" /></Button>{showEmojiPicker && (<div className="absolute z-10 mt-2"><EmojiPicker onEmojiClick={onEmojiClick} /></div>)}</div>
                </div>
                {isThreadMode && <p className="text-xs text-blue-500">Thread mode is on. Media will not be posted to Twitter.</p>}
              </div>

              {/* Platform Preview & Post Grid */}
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                {/* LinkedIn Card (No changes) */}
                <Card className={`transition-all ${!linkedinToken ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-linkedin"><Linkedin className="h-5 w-5" />LinkedIn Preview</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white dark:bg-black/20 rounded-lg p-3 min-h-[150px] border border-gray-200 dark:border-gray-700"><p className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{content || "Your text will appear here..."}</p>{mediaPreview && <img src={mediaPreview} alt="Media Preview" className="mt-2 rounded-lg w-full object-cover" />}</div>
                    <Badge variant={isLinkedinOverLimit ? "destructive" : "secondary"} className="w-full justify-center py-1">{contentLen}/{LINKEDIN_CHAR_LIMIT}</Badge>
                    <Button onClick={() => handlePost('linkedin')} disabled={postingPlatform !== null || (!content.trim() && !mediaFile) || isLinkedinOverLimit || !linkedinToken} className="w-full bg-linkedin hover:bg-linkedin/90 text-white">
                      {postingPlatform === 'linkedin' ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Posting...</> : <><Linkedin className="h-4 w-4 mr-2" />{!linkedinToken ? 'Connect to Post' : 'Post to LinkedIn'}</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* --- UPDATED: Twitter Card with Thread Logic --- */}
                <Card className={`transition-all ${!twitterToken ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-center">
                       <CardTitle className="flex items-center gap-2 text-lg text-twitter"><Twitter className="h-5 w-5" />Twitter Preview</CardTitle>
                       {twitterToken && (
                         <div className="flex items-center space-x-2">
                           <Label htmlFor="thread-mode" className="text-sm font-medium">Create a Thread</Label>
                           <Switch id="thread-mode" checked={isThreadMode} onCheckedChange={setIsThreadMode} />
                         </div>
                       )}
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-4">
                    {/* --- UPDATED: Conditional Preview for Threads --- */}
                    {!isThreadMode ? (
                      <div className="bg-white dark:bg-black/20 rounded-lg p-3 min-h-[150px] border border-gray-200 dark:border-gray-700">
                        <p className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{content || "Your text will appear here..."}</p>
                        {mediaPreview && <img src={mediaPreview} alt="Media Preview" className="mt-2 rounded-lg w-full object-cover" />}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                        {threadTweets.length > 0 ? threadTweets.map((tweet, index) => (
                          <div key={index} className="bg-white dark:bg-black/20 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{tweet}</p>
                          </div>
                        )) : (
                          <div className="bg-white dark:bg-black/20 rounded-lg p-3 min-h-[150px] border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                            <p className="text-sm text-gray-500">Your thread will be previewed here...</p>
                          </div>
                        )}
                      </div>
                    )}
                    <Badge variant={isTwitterOverLimit ? "destructive" : "secondary"} className="w-full justify-center py-1">
                      {isThreadMode ? `~${threadTweets.length} Tweets` : `${contentLen}/${TWITTER_CHAR_LIMIT}`}
                    </Badge>
                    <Button onClick={() => handlePost('twitter')} disabled={postingPlatform !== null || !content.trim() || isTwitterOverLimit || !twitterToken} className="w-full bg-twitter hover:bg-twitter/90 text-white">
                      {postingPlatform === 'twitter' ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Posting...</> : <><Rows className="h-4 w-4 mr-2" />{!twitterToken ? 'Connect to Post' : isThreadMode ? 'Post Thread to Twitter' : 'Post to Twitter'}</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Post to Both Button (No changes in logic, but button state is now thread-aware) */}
              <div className="pt-6 border-t">
                <Button onClick={() => handlePost('both')} disabled={postingPlatform !== null || !canPostToBoth} className="w-full bg-gradient-to-r from-linkedin via-primary to-twitter text-white text-base py-6 disabled:opacity-50">
                  {postingPlatform === 'both' ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />Posting to Both...</> : <><Share2 className="h-5 w-5 mr-3" />Post to Both Platforms</>}
                </Button>
                {(!linkedinToken || !twitterToken) && <p className="text-xs text-center text-gray-500 mt-2">Connect both accounts to enable this option.</p>}
                {linkedinToken && twitterToken && (isLinkedinOverLimit || isTwitterOverLimit) && <p className="text-xs text-center text-red-500 mt-2">Content is too long for one or more platforms.</p>}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}