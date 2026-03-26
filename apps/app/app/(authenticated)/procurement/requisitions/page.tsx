'use client';

import { useState } from 'react';
import { 
  Plus, 
  FileText, 
  Search, 
  Filter,
  MoreHorizontal 
} from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';

export default function RequisitionsPage() {
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requisitions</h1>
          <p className="text-muted-foreground">Create and manage purchase requests</p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Requisition
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requisitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No requisitions found.</p>
            <p className="text-sm">Create a new requisition to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
