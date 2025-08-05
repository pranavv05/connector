import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Linkedin, Twitter, AlertCircle, LogOut, Share2 } from "lucide-react"; // Added Share2 icon
import { useLocation, useNavigate } from "react-router-dom";

// --- Configuration ---
const LINKEDIN_CHAR_LIMIT = 3000;
const TWITTER_CHAR_LIMIT = 280;
// Use the correct Vite environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function SocialConnector() {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [linkedinToken, setLinkedinToken] = useState<string | null>(null);
  const [twitterToken, setTwitterToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Simplified useEffect to handle final token redirects ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinTokenFromUrl = params.get('linkedin_token');
    const twitterTokenFromUrl = params.get('twitter_token');
    const error = params.get('error');

    if (linkedinTokenFromUrl) {
      setLinkedinToken(linkedinTokenFromUrl);
      localStorage.setItem('linkedin_access_token', linkedinTokenFromUrl);
      toast({ title: "LinkedIn Connected!" });
      navigate("/", { replace: true });
    }
    if (twitterTokenFromUrl) {
      setTwitterToken(twitterTokenFromUrl);
      localStorage.setItem('twitter_access_token', twitterTokenFromUrl);
      toast({ title: "Twitter Connected!" });
      navigate("/", { replace: true });
    }
    if (error) {
      const serviceName = error.split('_')[0] || 'The service';
      toast({ title: "Connection Failed", description: `Login with ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} failed.`, variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [toast, navigate]);

  // --- Effect to check for stored tokens on load ---
  useEffect(() => {
    const storedLinkedinToken = localStorage.getItem('linkedin_access_token');
    if (storedLinkedinToken) setLinkedinToken(storedLinkedinToken);
    
    const storedTwitterToken = localStorage.getItem('twitter_access_token');
    if (storedTwitterToken) setTwitterToken(storedTwitterToken);
  }, []);

  // --- Character counts and limits ---
  const linkedinCount = content.length;
  const twitterCount = content.length;
  const isTwitterOverLimit = twitterCount > TWITTER_CHAR_LIMIT;
  const isLinkedinOverLimit = linkedinCount > LINKEDIN_CHAR_LIMIT;

  // --- Login Handlers ---
  const handleLinkedInLogin = () => {
    window.location.href = `${API_BASE_URL}/api/linkedin/auth`;
  };
  const handleTwitterLogin = () => {
    window.location.href = `${API_BASE_URL}/api/twitter/auth`;
  };
  
  // --- Logout Handler ---
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

  // --- UPDATED Main Post Handler ---
  const handlePost = async (platform: 'linkedin' | 'twitter' | 'both') => {
    if (!content.trim()) {
      toast({ title: "Content Required", description: "Please enter some content to post.", variant: "destructive" });
      return;
    }

    setIsPosting(true);

    const postToLinkedIn = async () => {
        if (isLinkedinOverLimit) throw new Error("Post is too long for LinkedIn.");
        if (!linkedinToken) throw new Error("LinkedIn is not connected.");
        const response = await fetch(`${API_BASE_URL}/api/linkedin/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content, accessToken: linkedinToken }),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.details || 'Failed to post to LinkedIn.');
        }
        toast({ title: "Posted to LinkedIn!", description: "Your content has been shared successfully." });
    };

    const postToTwitter = async () => {
        if (isTwitterOverLimit) throw new Error("Post is too long for Twitter.");
        if (!twitterToken) throw new Error("Twitter is not connected.");
        const response = await fetch(`${API_BASE_URL}/api/twitter/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content, accessToken: twitterToken }),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.details || 'Failed to post to Twitter.');
        }
        toast({ title: "Posted to Twitter!", description: "Your content has been shared successfully." });
    };

    try {
        if (platform === 'linkedin') {
            await postToLinkedIn();
        } else if (platform === 'twitter') {
            await postToTwitter();
        } else if (platform === 'both') {
            await postToLinkedIn(); // Post to LinkedIn first
            await postToTwitter();  // If LinkedIn succeeds, post to Twitter
            toast({ title: "Posted to Both Platforms!", description: "Your content has been shared everywhere." });
        }
        setContent(""); // Clear content on full success
    } catch (error: any) {
        console.error('Posting Error:', error);
        toast({ title: "Posting Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsPosting(false);
    }
  };
  
  // --- Derived state for the "Post to Both" button ---
  const canPostToBoth = linkedinToken && twitterToken && !isLinkedinOverLimit && !isTwitterOverLimit && content.trim() !== "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-linkedin via-primary to-twitter bg-clip-text text-transparent">
              Social Media Connector
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Write once, post everywhere. Connect your social accounts to share content instantly.
            </p>
          </div>

          {/* Connection Status Section */}
          <div className="space-y-4">
            {!linkedinToken && (
              <Card className="border-2 border-dashed border-linkedin/50 bg-linkedin/5">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-3"><AlertCircle className="h-5 w-5 text-linkedin" /><div><p className="font-medium">Connect Your LinkedIn Account</p><p className="text-sm text-muted-foreground">Click to connect your LinkedIn account.</p></div></div>
                  <Button onClick={handleLinkedInLogin} className="gap-2 bg-linkedin hover:bg-linkedin-hover text-white"><Linkedin className="h-4 w-4" />Connect to LinkedIn</Button>
                </CardContent>
              </Card>
            )}
            {!twitterToken && (
              <Card className="border-2 border-dashed border-twitter/50 bg-twitter/5">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-3"><AlertCircle className="h-5 w-5 text-twitter" /><div><p className="font-medium">Connect Your Twitter Account</p><p className="text-sm text-muted-foreground">Click to connect your Twitter account.</p></div></div>
                  <Button onClick={handleTwitterLogin} className="gap-2 bg-twitter hover:bg-twitter-hover text-white"><Twitter className="h-4 w-4" />Connect to Twitter</Button>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Main Composer Card */}
          <Card className="shadow-[0_0_30px_-5px] shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Compose Your Post</CardTitle>
              <CardDescription>Write your content below. Connect an account to enable the post buttons.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="What's on your mind?..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none border-2 focus:border-primary/50"
              />
              <div className="grid md:grid-cols-2 gap-6">
                {/* LinkedIn Card */}
                <Card className="border-linkedin/20 bg-gradient-to-br from-linkedin/5 to-transparent">
                  <CardHeader className="pb-3 flex-row items-center justify-between">
                    <div className="flex items-center gap-2"><Linkedin className="h-5 w-5 text-linkedin" /><span className="font-medium">LinkedIn</span></div>
                    {linkedinToken && <Button onClick={() => handleLogout('linkedin')} variant="ghost" size="sm" className="gap-1 text-xs"><LogOut className="h-3 w-3" />Logout</Button>}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-background/50 rounded-lg p-4 min-h-[100px] border border-linkedin/10"><p className="text-sm whitespace-pre-wrap break-words">{content || "Post preview..."}</p></div>
                    <Badge variant={isLinkedinOverLimit ? "destructive" : "secondary"} className="w-full justify-center">{linkedinCount}/{LINKEDIN_CHAR_LIMIT}</Badge>
                    <Button onClick={() => handlePost('linkedin')} disabled={isPosting || !content.trim() || isLinkedinOverLimit || !linkedinToken} className="w-full bg-linkedin hover:bg-linkedin-hover text-white">
                      {isPosting ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Posting...</> : <><Linkedin className="h-4 w-4 mr-2" />{!linkedinToken ? 'Connect to Post' : 'Post to LinkedIn'}</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Twitter Card */}
                <Card className="border-twitter/20 bg-gradient-to-br from-twitter/5 to-transparent">
                  <CardHeader className="pb-3 flex-row items-center justify-between">
                    <div className="flex items-center gap-2"><Twitter className="h-5 w-5 text-twitter" /><span className="font-medium">Twitter</span></div>
                    {twitterToken && <Button onClick={() => handleLogout('twitter')} variant="ghost" size="sm" className="gap-1 text-xs"><LogOut className="h-3 w-3" />Logout</Button>}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-background/50 rounded-lg p-4 min-h-[100px] border border-twitter/10"><p className="text-sm whitespace-pre-wrap break-words">{content || "Post preview..."}</p></div>
                    <Badge variant={isTwitterOverLimit ? "destructive" : "secondary"} className="w-full justify-center">{twitterCount}/{TWITTER_CHAR_LIMIT}</Badge>
                    <Button onClick={() => handlePost('twitter')} disabled={isPosting || !content.trim() || isTwitterOverLimit || !twitterToken} className="w-full bg-twitter hover:bg-twitter-hover text-white">
                      {isPosting ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Posting...</> : <><Twitter className="h-4 w-4 mr-2" />{!twitterToken ? 'Connect to Post' : 'Post to Twitter'}</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* NEW: Post to Both Button */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => handlePost('both')} 
                  disabled={isPosting || !canPostToBoth} 
                  className="w-full bg-gradient-to-r from-linkedin via-primary to-twitter text-white text-base py-6"
                >
                  {isPosting ? 
                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />Posting to Both...</> : 
                    <><Share2 className="h-5 w-5 mr-3" />Post to Both Platforms</>
                  }
                </Button>
                {!canPostToBoth && <p className="text-xs text-center text-muted-foreground mt-2">Connect both accounts and ensure content is within both character limits to enable.</p>}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
