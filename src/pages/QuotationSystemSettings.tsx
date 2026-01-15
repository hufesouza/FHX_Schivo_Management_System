import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Search, Plus, Settings, DollarSign, Percent, Truck, Trash2, Package, Users } from 'lucide-react';
import { useQuotationResources, useQuotationSettings } from '@/hooks/useQuotationSystem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubconVendor {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

interface MaterialSupplier {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

interface Customer {
  id: string;
  bp_code: string;
  bp_name: string;
  is_active: boolean;
}

const QuotationSystemSettings = () => {
  const { resources, loading: resourcesLoading, updateResource, addResource } = useQuotationResources();
  const { settings, loading: settingsLoading, updateSetting } = useQuotationSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [newResource, setNewResource] = useState({ resource_no: '', resource_description: '', cost_per_minute: 0 });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Vendor state
  const [vendors, setVendors] = useState<SubconVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [newVendor, setNewVendor] = useState({ bp_code: '', bp_name: '' });
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);

  // Material Supplier state
  const [suppliers, setSuppliers] = useState<MaterialSupplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [newSupplier, setNewSupplier] = useState({ bp_code: '', bp_name: '' });
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [newCustomer, setNewCustomer] = useState({ bp_code: '', bp_name: '' });
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_subcon_vendors')
        .select('*')
        .order('bp_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_material_suppliers')
        .select('*')
        .order('bp_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load material suppliers');
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotation_customers')
        .select('*')
        .order('bp_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchSuppliers();
    fetchCustomers();
  }, [fetchVendors, fetchSuppliers, fetchCustomers]);

  const filteredResources = resources.filter(r => 
    r.resource_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.resource_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.bp_name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
    v.bp_code.toLowerCase().includes(vendorSearchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.bp_name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    s.bp_code.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.bp_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.bp_code.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );


  const handleAddResource = async () => {
    if (!newResource.resource_no || !newResource.resource_description) {
      return;
    }
    await addResource(newResource);
    setNewResource({ resource_no: '', resource_description: '', cost_per_minute: 0 });
    setIsAddDialogOpen(false);
  };

  const handleAddVendor = async () => {
    if (!newVendor.bp_code || !newVendor.bp_name) {
      toast.error('Please fill in both BP Code and BP Name');
      return;
    }
    try {
      const { error } = await supabase
        .from('quotation_subcon_vendors')
        .insert(newVendor);

      if (error) throw error;
      toast.success('Vendor added');
      setNewVendor({ bp_code: '', bp_name: '' });
      setIsAddVendorDialogOpen(false);
      fetchVendors();
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast.error('Failed to add vendor');
    }
  };

  const handleToggleVendorActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('quotation_subcon_vendors')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchVendors();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotation_subcon_vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Vendor deleted');
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.bp_code || !newSupplier.bp_name) {
      toast.error('Please fill in both BP Code and BP Name');
      return;
    }
    try {
      const { error } = await supabase
        .from('quotation_material_suppliers')
        .insert(newSupplier);

      if (error) throw error;
      toast.success('Supplier added');
      setNewSupplier({ bp_code: '', bp_name: '' });
      setIsAddSupplierDialogOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Failed to add supplier');
    }
  };

  const handleToggleSupplierActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('quotation_material_suppliers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchSuppliers();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('Failed to update supplier');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotation_material_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.bp_code || !newCustomer.bp_name) {
      toast.error('Please fill in both BP Code and BP Name');
      return;
    }
    try {
      const { error } = await supabase
        .from('quotation_customers')
        .insert(newCustomer);

      if (error) throw error;
      toast.success('Customer added');
      setNewCustomer({ bp_code: '', bp_name: '' });
      setIsAddCustomerDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const handleToggleCustomerActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('quotation_customers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotation_customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const formatSettingName = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (resourcesLoading || settingsLoading || vendorsLoading || suppliersLoading || customersLoading) {
    return (
      <AppLayout title="Quotation Settings" subtitle="Resource Ratings & System Configuration" showBackButton backTo="/npi/quotation-system">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quotation Settings" subtitle="Resource Ratings & System Configuration" showBackButton backTo="/npi/quotation-system">
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resource Cost Ratings</CardTitle>
                    <CardDescription>
                      Manage the cost per minute for each manufacturing resource
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Resource
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Resource</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Resource Code</Label>
                          <Input
                            value={newResource.resource_no}
                            onChange={(e) => setNewResource({ ...newResource, resource_no: e.target.value })}
                            placeholder="e.g., Doosan5100-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={newResource.resource_description}
                            onChange={(e) => setNewResource({ ...newResource, resource_description: e.target.value })}
                            placeholder="e.g., Doosan NHP 5100 Machine 2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost per Minute (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newResource.cost_per_minute}
                            onChange={(e) => setNewResource({ ...newResource, cost_per_minute: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <Button onClick={handleAddResource} className="w-full">
                          Add Resource
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="border rounded-lg max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Resource Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Cost/Min (€)</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell className="font-mono text-sm">
                            {resource.resource_no}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {resource.resource_description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={resource.cost_per_minute}
                              className="w-24 ml-auto text-right"
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                if (newValue !== resource.cost_per_minute) {
                                  updateResource(resource.id, { cost_per_minute: newValue });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={resource.is_active}
                              onCheckedChange={(checked) => updateResource(resource.id, { is_active: checked })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Showing {filteredResources.length} of {resources.length} resources
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subcon Vendors</CardTitle>
                    <CardDescription>
                      Manage subcontractor vendors for outsourced processes
                    </CardDescription>
                  </div>
                  <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vendor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>BP Code</Label>
                          <Input
                            value={newVendor.bp_code}
                            onChange={(e) => setNewVendor({ ...newVendor, bp_code: e.target.value })}
                            placeholder="e.g., SA0001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>BP Name</Label>
                          <Input
                            value={newVendor.bp_name}
                            onChange={(e) => setNewVendor({ ...newVendor, bp_name: e.target.value })}
                            placeholder="e.g., Acme Coatings Ltd."
                          />
                        </div>
                        <Button onClick={handleAddVendor} className="w-full">
                          Add Vendor
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors..."
                      value={vendorSearchTerm}
                      onChange={(e) => setVendorSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="border rounded-lg max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>BP Code</TableHead>
                        <TableHead>BP Name</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-mono text-sm">
                            {vendor.bp_code}
                          </TableCell>
                          <TableCell>
                            {vendor.bp_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={vendor.is_active}
                              onCheckedChange={(checked) => handleToggleVendorActive(vendor.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteVendor(vendor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Showing {filteredVendors.length} of {vendors.length} vendors
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Material Suppliers</CardTitle>
                    <CardDescription>
                      Manage material suppliers for raw materials and components
                    </CardDescription>
                  </div>
                  <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Supplier
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Supplier</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>BP Code</Label>
                          <Input
                            value={newSupplier.bp_code}
                            onChange={(e) => setNewSupplier({ ...newSupplier, bp_code: e.target.value })}
                            placeholder="e.g., SA0001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>BP Name</Label>
                          <Input
                            value={newSupplier.bp_name}
                            onChange={(e) => setNewSupplier({ ...newSupplier, bp_name: e.target.value })}
                            placeholder="e.g., Abbey Seals"
                          />
                        </div>
                        <Button onClick={handleAddSupplier} className="w-full">
                          Add Supplier
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search suppliers..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="border rounded-lg max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>BP Code</TableHead>
                        <TableHead>BP Name</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-mono text-sm">
                            {supplier.bp_code}
                          </TableCell>
                          <TableCell>
                            {supplier.bp_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={supplier.is_active}
                              onCheckedChange={(checked) => handleToggleSupplierActive(supplier.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customers</CardTitle>
                    <CardDescription>
                      Manage customer accounts for quotations
                    </CardDescription>
                  </div>
                  <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>BP Code</Label>
                          <Input
                            value={newCustomer.bp_code}
                            onChange={(e) => setNewCustomer({ ...newCustomer, bp_code: e.target.value })}
                            placeholder="e.g., CA0001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>BP Name</Label>
                          <Input
                            value={newCustomer.bp_name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, bp_name: e.target.value })}
                            placeholder="e.g., Acme Corporation"
                          />
                        </div>
                        <Button onClick={handleAddCustomer} className="w-full">
                          Add Customer
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="border rounded-lg max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>BP Code</TableHead>
                        <TableHead>BP Name</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-mono text-sm">
                            {customer.bp_code}
                          </TableCell>
                          <TableCell>
                            {customer.bp_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={customer.is_active}
                              onCheckedChange={(checked) => handleToggleCustomerActive(customer.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Showing {filteredCustomers.length} of {customers.length} customers
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>General Quotation Settings</CardTitle>
                <CardDescription>
                  Configure default values for quotation calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {settings.map((setting) => (
                    <div key={setting.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {setting.setting_key.includes('margin') ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        )}
                        {formatSettingName(setting.setting_key)}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={setting.setting_value}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (newValue !== setting.setting_value) {
                              updateSetting(setting.id, newValue);
                            }
                          }}
                          className="flex-1"
                        />
                        <span className="flex items-center text-muted-foreground text-sm">
                          {setting.setting_key.includes('margin') || setting.setting_key.includes('markup') ? '%' : '€'}
                        </span>
                      </div>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default QuotationSystemSettings;
