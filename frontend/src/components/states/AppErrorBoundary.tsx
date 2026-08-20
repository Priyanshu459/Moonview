import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ErrorState.js';

interface Props {
  area: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Moonview ${this.props.area} render failure`, error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '50dvh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <ErrorState
            title={`${this.props.area} unavailable`}
            error={this.state.error}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
