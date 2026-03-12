import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import TTSApp from "@/pages/TTSApp";
import PerplexityAttribution from "@/components/PerplexityAttribution";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={TTSApp} />
          </Switch>
        </Router>
        <PerplexityAttribution />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
