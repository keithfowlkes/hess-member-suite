import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useProgressiveSystemAnalytics, SystemUsage } from '@/hooks/useProgressiveSystemAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

interface ProgressiveSystemChartProps {
  title: string;
  systemField: string;
  chartType: 'pie' | 'line';
  onSystemClick: (systemField: string, systemName: string, systemDisplayName: string) => void;
}

export function ProgressiveSystemChart({ 
  title, 
  systemField, 
  chartType, 
  onSystemClick 
}: ProgressiveSystemChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Progressive loading with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Start loading 100px before the element is visible
      }
    );

    const currentRef = chartRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasLoaded]);

  const { data, isLoading, error } = useProgressiveSystemAnalytics(systemField, isVisible);

  const renderSkeletonChart = () => (
    <Card className="w-full bg-gradient-to-br from-card to-card/50 border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <div className="mt-3 space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderChart = (data: SystemUsage[]) => (
    <Card className="w-full bg-gradient-to-br from-card to-card/50 border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-2xl font-bold text-foreground">
          {data.reduce((sum, item) => sum + item.count, 0)} institutions
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-48">
          {chartType === 'pie' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                  label={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, 'Institutions']}
                  labelFormatter={(label) => data.find(d => d.count === label)?.name || label}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <button
                  onClick={() => onSystemClick(systemField, item.name, title)}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[120px] text-left cursor-pointer"
                  title={`Click to view institutions using ${item.name}`}
                >
                  {item.name}
                </button>
              </div>
              <span className="font-medium text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div ref={chartRef}>
      {!isVisible || isLoading ? (
        renderSkeletonChart()
      ) : error ? (
        <Card className="w-full bg-gradient-to-br from-card to-card/50 border-2 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p>Error loading chart data</p>
            </div>
          </CardContent>
        </Card>
      ) : data && Array.isArray(data) && data.length > 0 ? (
        renderChart(data)
      ) : null}
    </div>
  );
}