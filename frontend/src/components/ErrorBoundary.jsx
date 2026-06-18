import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
