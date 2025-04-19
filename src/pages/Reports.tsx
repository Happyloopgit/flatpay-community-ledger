
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReceiptsPaymentsTab from '@/components/reports/ReceiptsPaymentsTab';
import IncomeExpenditureTab from '@/components/reports/IncomeExpenditureTab';
import MemberLedgerTab from '@/components/reports/MemberLedgerTab';

const ReportsPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>

      <Tabs defaultValue="receipts-payments" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-4">
          <TabsTrigger value="receipts-payments">Receipts & Payments</TabsTrigger>
          <TabsTrigger value="income-expenditure">Income & Expenditure</TabsTrigger>
          <TabsTrigger value="member-ledger">Member Ledger</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receipts-payments">
          <ReceiptsPaymentsTab />
        </TabsContent>
        <TabsContent value="income-expenditure">
          <IncomeExpenditureTab />
        </TabsContent>
        <TabsContent value="member-ledger">
          <MemberLedgerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
