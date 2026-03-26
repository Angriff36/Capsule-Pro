'use client';

import { Plus, FileText } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';

export default function VendorContractsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vendor Contracts</h1>
          <p className="text-muted-foreground">Manage vendor agreements and terms</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vendor contracts found.</p>
            <p className="text-sm">Add vendor contracts to track terms and agreements.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
