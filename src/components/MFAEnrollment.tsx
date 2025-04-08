
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, Loader2 } from "lucide-react";

interface MFAEnrollmentProps {
  onEnrollmentComplete?: () => void;
}

export const MFAEnrollment = ({ onEnrollmentComplete }: MFAEnrollmentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [existingFactorId, setExistingFactorId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user already has MFA factors set up
    const checkExistingFactors = async () => {
      setIsLoading(true);
      try {
        // First check if user has any existing factors
        const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
        
        if (factorError) {
          console.error("Error checking MFA factors:", factorError);
          throw factorError;
        }
        
        // Look for existing TOTP factor
        const existingFactor = factorData.totp.find(factor => 
          factor.factor_type === 'totp' && factor.status === 'verified'
        );
        
        if (existingFactor) {
          console.log("Found existing verified TOTP factor:", existingFactor.id);
          setIsEnrolled(true);
          setExistingFactorId(existingFactor.id);
        } else {
          // Also check the AAL level as a fallback
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalError) {
            console.error("Error checking MFA AAL status:", aalError);
          } else {
            setIsEnrolled(aalData?.currentLevel === "aal2");
          }
        }
      } catch (err) {
        console.error("Error in checkExistingFactors:", err);
        toast({
          title: "Error checking MFA status",
          description: err instanceof Error ? err.message : "Failed to check MFA enrollment status",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingFactors();
  }, []);

  const handleStartEnrollment = async () => {
    setIsEnrolling(true);
    setError(null);

    try {
      // Check again for existing factors to prevent race conditions
      const { data: checkData, error: checkError } = await supabase.auth.mfa.listFactors();
      
      if (checkError) {
        throw checkError;
      }
      
      // Verify no existing TOTP factor before proceeding
      const existingFactor = checkData.totp.find(factor => 
        factor.factor_type === 'totp' && (factor.status === 'verified' || factor.status === 'unverified')
      );
      
      if (existingFactor) {
        throw new Error("You already have MFA configured for this account");
      }

      // If no existing factor, proceed with enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "FlatPay",
        friendlyName: "FlatPay MFA",
      });

      if (error) {
        throw error;
      }

      if (!data?.id || !data.totp) {
        throw new Error("Failed to start MFA enrollment");
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start MFA enrollment");
      toast({
        title: "MFA enrollment failed",
        description: err instanceof Error ? err.message : "Failed to start MFA enrollment",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!factorId) {
      setError("MFA enrollment not initialized properly");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: totpCode,
      });

      if (error) {
        throw error;
      }

      // Get the current user's ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw userError || new Error("Could not retrieve user information");
      }

      // Update the user's profile to mark MFA as enabled
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: true })
        .eq("id", userData.user.id);

      if (updateError) {
        console.error("Failed to update profile:", updateError);
        // We don't throw here because the MFA is technically enabled even if the profile update fails
      }

      setIsEnrolled(true);
      setQrCode(null);
      setSecret(null);
      setTotpCode("");
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication is now active on your account",
      });

      if (onEnrollmentComplete) {
        onEnrollmentComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify MFA code");
      toast({
        title: "MFA verification failed",
        description: err instanceof Error ? err.message : "Failed to verify MFA code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!existingFactorId) {
      // Try to fetch the factor ID if we don't have it
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error || !data) {
          throw error || new Error("Could not retrieve MFA factors");
        }
        
        const factor = data.totp.find(f => f.status === 'verified');
        if (!factor || !factor.id) {
          throw new Error("No active MFA factor found");
        }
        
        setExistingFactorId(factor.id);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to retrieve MFA factors",
          variant: "destructive",
        });
        return;
      }
    }
    
    // This would need to be implemented based on your security requirements
    // Typically requires password verification or other security checks
    toast({
      title: "Not implemented",
      description: "MFA removal requires additional security measures",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading MFA status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEnrolled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Your account is protected with two-factor authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              For enhanced security, two-factor authentication is required for all society administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleDisableMFA}>
            Disable Two-Factor Authentication
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enhance your account security by enabling two-factor authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!qrCode && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Two-factor authentication adds an extra layer of security to your account by requiring a verification 
                code from your mobile authenticator app in addition to your password.
              </AlertDescription>
            </Alert>
            <Button onClick={handleStartEnrollment} disabled={isEnrolling}>
              {isEnrolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting up...
                </>
              ) : (
                "Enable Two-Factor Authentication"
              )}
            </Button>
          </div>
        )}

        {qrCode && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="border border-gray-200 rounded-md p-4 bg-white">
                  <QRCodeSVG value={qrCode} size={200} />
                </div>
                <p className="text-sm text-gray-500">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {secret && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">Or enter this code manually:</p>
                  <div className="bg-gray-100 p-3 rounded-md text-center font-mono break-all">
                    {secret}
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-6">
                <label htmlFor="totpCode" className="text-sm font-medium">
                  Enter the verification code from your app
                </label>
                <Input
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isVerifying || totpCode.length !== 6}>
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify and Enable"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
