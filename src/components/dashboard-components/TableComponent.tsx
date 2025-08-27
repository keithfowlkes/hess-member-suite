import { DashboardComponent } from '@/hooks/useDashboards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data generators for different data sources
const generateTableData = (config: any) => {
  const { dataSource, columns = [], limit = 10 } = config;
  
  if (dataSource === 'organizations') {
    return [
      { name: 'University of Texas', membership_status: 'Active', city: 'Austin', state: 'TX', student_fte: 51000 },
      { name: 'UCLA', membership_status: 'Active', city: 'Los Angeles', state: 'CA', student_fte: 44500 },
      { name: 'Florida State University', membership_status: 'Pending', city: 'Tallahassee', state: 'FL', student_fte: 35000 },
      { name: 'NYU', membership_status: 'Active', city: 'New York', state: 'NY', student_fte: 28000 },
      { name: 'Chicago State University', membership_status: 'Active', city: 'Chicago', state: 'IL', student_fte: 22000 },
      { name: 'Ohio State University', membership_status: 'Inactive', city: 'Columbus', state: 'OH', student_fte: 45000 }
    ].slice(0, limit);
  }
  
  if (dataSource === 'invoices') {
    return [
      { invoice_number: 'INV-2024-001', organization: 'University of Texas', amount: '$1,200', status: 'Paid', due_date: '2024-01-15' },
      { invoice_number: 'INV-2024-002', organization: 'UCLA', amount: '$1,200', status: 'Sent', due_date: '2024-01-20' },
      { invoice_number: 'INV-2024-003', organization: 'Florida State', amount: '$800', status: 'Overdue', due_date: '2024-01-10' },
      { invoice_number: 'INV-2024-004', organization: 'NYU', amount: '$1,200', status: 'Paid', due_date: '2024-01-25' },
      { invoice_number: 'INV-2024-005', organization: 'Chicago State', amount: '$600', status: 'Draft', due_date: '2024-02-01' }
    ].slice(0, limit);
  }
  
  if (dataSource === 'profiles') {
    return [
      { first_name: 'John', last_name: 'Smith', email: 'john.smith@utexas.edu', organization: 'University of Texas', role: 'Admin' },
      { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@ucla.edu', organization: 'UCLA', role: 'Member' },
      { first_name: 'Mike', last_name: 'Davis', email: 'm.davis@fsu.edu', organization: 'Florida State', role: 'Member' },
      { first_name: 'Emily', last_name: 'Brown', email: 'emily.brown@nyu.edu', organization: 'NYU', role: 'Member' },
      { first_name: 'David', last_name: 'Wilson', email: 'd.wilson@csu.edu', organization: 'Chicago State', role: 'Member' }
    ].slice(0, limit);
  }
  
  return [];
};

interface TableComponentProps {
  component: DashboardComponent;
}

export function TableComponent({ component }: TableComponentProps) {
  const data = generateTableData(component.config);
  const columns = component.config.columns || [];
  
  if (!data.length || !columns.length) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-2xl mb-2">📋</div>
        <div className="text-sm font-medium">Data Table</div>
        <div className="text-xs text-muted-foreground">
          Source: {component.config.dataSource || 'organizations'}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column: string) => (
              <TableHead key={column} className="font-medium">
                {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column: string) => (
                <TableCell key={column}>
                  {row[column] || '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
        Showing {data.length} records from {component.config.dataSource}
      </div>
    </div>
  );
}