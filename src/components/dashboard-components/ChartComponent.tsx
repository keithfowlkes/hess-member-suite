import { DashboardComponent } from '@/hooks/useDashboards';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// Mock data generators based on database schema
const generateMockData = (config: any) => {
  const { dataSource, chartType, xAxis, yAxis } = config;
  
  if (dataSource === 'organizations') {
    if (xAxis === 'state' || xAxis === 'membership_status') {
      return [
        { name: 'Texas', value: 45, count: 45 },
        { name: 'California', value: 38, count: 38 },
        { name: 'Florida', value: 32, count: 32 },
        { name: 'New York', value: 28, count: 28 },
        { name: 'Illinois', value: 24, count: 24 },
        { name: 'Ohio', value: 22, count: 22 }
      ];
    }
    if (xAxis === 'membership_status') {
      return [
        { name: 'Active', value: 156, count: 156 },
        { name: 'Pending', value: 23, count: 23 },
        { name: 'Inactive', value: 12, count: 12 }
      ];
    }
  }
  
  if (dataSource === 'invoices') {
    if (chartType === 'line' || chartType === 'area') {
      return [
        { name: 'Jan', value: 45000, amount: 45000 },
        { name: 'Feb', value: 52000, amount: 52000 },
        { name: 'Mar', value: 48000, amount: 48000 },
        { name: 'Apr', value: 61000, amount: 61000 },
        { name: 'May', value: 55000, amount: 55000 },
        { name: 'Jun', value: 67000, amount: 67000 }
      ];
    }
    return [
      { name: 'Paid', value: 142, count: 142 },
      { name: 'Sent', value: 23, count: 23 },
      { name: 'Draft', value: 15, count: 15 },
      { name: 'Overdue', value: 8, count: 8 }
    ];
  }
  
  // Default data
  return [
    { name: 'Category A', value: 120, count: 120 },
    { name: 'Category B', value: 98, count: 98 },
    { name: 'Category C', value: 86, count: 86 },
    { name: 'Category D', value: 74, count: 74 }
  ];
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

interface ChartComponentProps {
  component: DashboardComponent;
}

export function ChartComponent({ component }: ChartComponentProps) {
  const data = generateMockData(component.config);
  const { chartType = 'bar' } = component.config;
  
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default: // bar
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="h-64">
      {renderChart()}
      <div className="mt-2 text-center">
        <div className="text-xs text-muted-foreground">
          Data: {component.config.dataSource || 'organizations'} • Type: {chartType}
        </div>
      </div>
    </div>
  );
}