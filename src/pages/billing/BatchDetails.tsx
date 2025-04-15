import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CancelBatchResponse } from '@/types/supabase';

const BatchDetails = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: batch, isLoading: isBatchLoading, error: batchError } = useQuery({
    queryKey: ['invoice-batch', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleCancelBatch = async () => {
    if (!batchId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<CancelBatchResponse>('cancel-batch', {
        body: { batch_id: parseInt(batchId) }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: `Batch cancelled successfully. ${data.deleted_invoices} invoices were deleted.`,
        });
        navigate('/billing');
      } else {
        throw new Error(data?.message || 'Failed to cancel batch');
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel batch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowCancelDialog(false);
    }
  };

  if (isBatchLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (batchError) {
    return (
      <div className="p-4 text-red-500">
        Error loading batch details: {batchError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Batch Details</h1>
        
        {batch?.status === 'Draft' && (
          <div className="flex gap-4">
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Batch'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Draft Batch</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this draft batch? All draft invoices within it will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelBatch}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Rest of the batch details UI */}
      <div>
        <h2 className="text-xl font-semibold">Batch Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Batch ID:</strong> {batch?.id}
          </div>
          <div>
            <strong>Created At:</strong> {batch?.created_at}
          </div>
          <div>
            <strong>Status:</strong> {batch?.status}
          </div>
          {batch?.error_message && (
            <div>
              <strong>Error Message:</strong> {batch?.error_message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetails;
