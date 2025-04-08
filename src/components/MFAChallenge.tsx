
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AlertCircleIcon } from "lucide-react";

interface MFAChallengeProps {
  onComplete: () => void;
}

export const MFAChallenge = ({ onComplete }: MFAChallengeProps) => {
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get the factors first to obtain the factorId
      const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
      
      if (factorError) {
        throw factorError;
      }

      // Find the first verified TOTP factor
      const totpFactor = factorData.totp.find(factor => factor.factor_type === 'totp');
      
      if (!totpFactor || !totpFactor.id) {
        throw new Error("No TOTP factor found for verification");
      }

      // Create challenge with the factorId
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) {
        throw challengeError;
      }

      if (!challengeData?.id) {
        throw new Error("Failed to create MFA challenge");
      }

      // Then verify with the challenge id and user's TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: totpCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      toast({
        title: "MFA successful",
        description: "You have successfully verified with MFA",
      });
      
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify MFA code");
      toast({
        title: "MFA verification failed",
        description: err instanceof Error ? err.message : "Failed to verify MFA code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500">
          Please enter the verification code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="totpCode" className="text-sm font-medium">
            Verification Code
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
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mt-1">
              <AlertCircleIcon className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || totpCode.length !== 6}>
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
      </form>
    </div>
  );
};
