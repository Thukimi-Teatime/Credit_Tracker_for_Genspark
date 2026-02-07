# Credit Tracker for Genspark

A browser extension to manage and visualize your Genspark.ai credit usage.

### 1. Key Features
- **Usage Recording**: Captures and records credit balance when you interact with the Genspark UI.
- **Pace Visualization**: Calculates your current consumption speed and compares it with a target pace.
- **Status Feedback**: Visual indicators (color-coded) for "On Track," "Over Target," etc.
- **Cycle Insights**: Estimates how many days of credits you have ahead of or behind your schedule.
- **Currency Conversion**: Translates credit values into real-world currency (USD, JPY, etc.) based on settings.
- **Integrated UI**: Seamlessly displays information via a sidebar or embedded widgets without disrupting your workflow.

> [!IMPORTANT]
> ### 2. How to Use
> This extension updates your credit data whenever you open your profile menu to display your credits. Since tracking is not fully automatic, please check your profile regularly to keep your data current.
>
> 1. **Recording Data**:
>    - Visit Genspark.ai and open the profile menu where your credits are displayed.
>    - The extension will automatically detect the value and record it as your latest credit.
> 2. **Customizing for Your Plan**:
>    - In the same profile menu, click the **Settings** button (provided by the extension) to configure your plan.
>    - Enter your "Plan Start Credits" (e.g., 10,000) and "Renewal Day" (e.g., Day 1), and save.
> 3. **Monitoring Status**:
>    - Check the sidebar or popup to view metrics like your current pace and "Days Ahead/Behind."
>
> *Note: Due to technical constraints, this extension does not operate on the "New Tab" page of the Genspark browser.*

### 3. Settings & Parameters
The values you enter in the settings are used as follows:

| Setting Item | Purpose & Impact |
| :--- | :--- |
| **Renewal Day** | Determines the start and end dates of your billing cycle, affecting "Days Elapsed" and "Days Left." |
| **Monthly Base Credits** | The standard credits included in your plan. This is the baseline for calculating the "Target Pace." |
| **Purchased Credits** | Extra credits purchased. These are added to the base credits to determine the "Total Start Credit" for the cycle. |
| **Price Conversion** | When enabled, converts credits into currency displays.<br>・**Monthly Fee**: Enter your monthly plan cost.<br>・**Decimal Places**: Set the number of digits to show after the decimal point.<br>・**Calculation**: `Unit Price per Credit = Monthly Fee / Monthly Base Credits`<br>This multiplying this unit price by your balance helps you intuitively grasp the remaining monetary value. |

### 4. Calculated Items & Formulas
This extension analyzes your usage using the following formulas:

| Item | Formula / Description |
| :--- | :--- |
| **Total Start Credit** | `Plan Start Credit (Base) + Purchased Credits (Purchased)` |
| **Days Elapsed** | `Days since the start of current cycle (Min: 1)` |
| **Days Left** | `Days remaining until next renewal (Min: 1)` |
| **Actual Pace** | `(Total Start Credit - Current Credit) / Days Elapsed` (Per day) |
| **Target Pace** | `Plan Start Credit (Base) / Total Days in Cycle` |
| **Ideal Balance** | `Total Start Credit - (Target Pace × Days Elapsed)` |
| **Days Ahead/Behind** | `(Current Credit - Ideal Balance) / Target Pace` |

**Status Logic:**
- `Deviation % = (Actual Pace - Target Pace) / Target Pace × 100`
- **🟢 Excellent**: Deviation < -10% (Saving credits)
- **🟢 On Track**: Deviation between -10% and +10%
- **🟡 Slightly Over**: Deviation between +10% and +30%
- **🔴 Over Target**: Deviation > +30%

---

Created by **Genspark AI Developer** in collaboration with **Antigravity**.
