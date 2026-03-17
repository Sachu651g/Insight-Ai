"""
visualizer.py — Dark-themed Matplotlib chart generator
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import pandas as pd
import os

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
CHART_PATH = os.path.join(BASE_DIR, "chart.png")

# Dark theme colours matching the frontend
BG      = '#0d0f14'
PANEL   = '#141720'
CYAN    = '#00e5ff'
GREEN   = '#00ff9d'
AMBER   = '#ffb300'
MAGENTA = '#e040fb'
TEXT    = '#e8eaf6'
MUTED   = '#7986cb'
GRID    = '#1e2235'

PALETTE = [CYAN, GREEN, AMBER, MAGENTA, '#ff4d6a', '#80cbc4']


def create_chart(df, title="Business Data Visualization"):
    if df is None or df.empty:
        return None

    try:
        df      = df.copy().head(20)
        columns = list(df.columns)

        fig, ax = plt.subplots(figsize=(9, 4.5))
        fig.patch.set_facecolor(BG)
        ax.set_facecolor(PANEL)

        # Axis styling
        for spine in ax.spines.values():
            spine.set_color(GRID)
        ax.tick_params(colors=MUTED, labelsize=9)
        ax.xaxis.label.set_color(MUTED)
        ax.yaxis.label.set_color(MUTED)
        ax.grid(color=GRID, linestyle='--', linewidth=0.6, alpha=0.7)
        ax.set_axisbelow(True)

        if len(columns) == 1:
            # Single column — bar chart of values
            y = pd.to_numeric(df[columns[0]], errors='coerce').fillna(0).values
            x = list(range(len(y)))
            bars = ax.bar(x, y, color=CYAN, alpha=0.85, edgecolor=PANEL, linewidth=0.5)
            ax.set_xlabel("Index", color=MUTED)
            ax.set_ylabel(columns[0], color=MUTED)
            _add_value_labels(ax, bars, y)

        else:
            x_col = columns[0]
            y_col = columns[1]
            x_raw = df[x_col].astype(str).values
            y_raw = pd.to_numeric(df[y_col], errors='coerce').fillna(0).values

            is_time = any(kw in x_col.lower() for kw in ("date","day","month","year","time","period"))

            if is_time:
                # Line chart for time series
                ax.plot(range(len(x_raw)), y_raw, color=CYAN, linewidth=2.5,
                        marker='o', markersize=5, markerfacecolor=AMBER, markeredgecolor=PANEL)
                ax.fill_between(range(len(x_raw)), y_raw, alpha=0.15, color=CYAN)
                step = max(1, len(x_raw) // 10)
                ax.set_xticks(range(0, len(x_raw), step))
                ax.set_xticklabels(x_raw[::step], rotation=35, ha='right', fontsize=8)
                ax.set_xlabel(x_col, color=MUTED)
                ax.set_ylabel(y_col, color=MUTED)
            else:
                # Sort and bar chart
                sort_idx = y_raw.argsort()[::-1]
                x_sorted = x_raw[sort_idx]
                y_sorted = y_raw[sort_idx]
                colors   = [PALETTE[i % len(PALETTE)] for i in range(len(x_sorted))]
                bars     = ax.bar(range(len(x_sorted)), y_sorted,
                                  color=colors, alpha=0.88, edgecolor=PANEL, linewidth=0.5)
                ax.set_xticks(range(len(x_sorted)))
                ax.set_xticklabels(x_sorted, rotation=30, ha='right', fontsize=8.5)
                ax.set_xlabel(x_col, color=MUTED)
                ax.set_ylabel(y_col, color=MUTED)
                _add_value_labels(ax, bars, y_sorted)

        # Format y-axis numbers
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(
            lambda v, _: f'₹{v:,.0f}' if v >= 100 else f'{v:,.0f}'
        ))

        # Title
        fig.suptitle(title, color=TEXT, fontsize=12, fontweight='bold', y=0.98)

        plt.tight_layout(rect=[0, 0, 1, 0.95])
        plt.savefig(CHART_PATH, dpi=130, bbox_inches='tight',
                    facecolor=BG, edgecolor='none')
        plt.close(fig)
        return "chart.png"

    except Exception as e:
        print(f"[visualizer] Chart error: {e}")
        try:
            plt.close('all')
        except Exception:
            pass
        return None


def _add_value_labels(ax, bars, values):
    """Add value labels on top of bars."""
    max_v = max(values) if len(values) > 0 else 1
    for bar, val in zip(bars, values):
        if val > 0:
            label = f'₹{val:,.0f}' if val >= 100 else f'{val:,.0f}'
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max_v * 0.01,
                label,
                ha='center', va='bottom',
                color=MUTED, fontsize=7.5, fontweight='bold'
            )
