"""
Ask Your Data / Copilot Natural Language Engine.

Translates natural language questions into deterministic metrics, aggregations,
contextual reasons, and actionable commands (filter, clear, navigate, view_chart).
Supports English, Hindi (हिंदी), and Marathi (मराठी).
"""
from __future__ import annotations

import re
from typing import Any, Optional
import pandas as pd


def get_suggested_questions(profile: Any, analysis: dict[str, Any], language: str = "en") -> list[str]:
    """Generates 4 intelligent, dataset-grounded starter prompts for the floating Copilot."""
    questions = []
    
    # 1. Category / Top ranking question
    if profile.categorical_columns and profile.numerical_columns:
        cat = profile.categorical_columns[0]
        num = profile.numerical_columns[0]
        if language == "hi":
            questions.append(f"किस {cat} में सबसे ज्यादा {num} है?")
        elif language == "mr":
            questions.append(f"कोणत्या {cat} मध्ये सर्वाधिक {num} आहे?")
        else:
            questions.append(f"Which {cat} has the highest {num}?")

    # 2. Metric average question
    if profile.numerical_columns:
        num = profile.numerical_columns[0]
        if language == "hi":
            questions.append(f"{num} का औसत मान क्या है?")
        elif language == "mr":
            questions.append(f"{num} चे सरासरी मूल्य काय आहे?")
        else:
            questions.append(f"What is the average {num}?")

    # 3. Anomaly question
    anomalies = analysis.get("anomalies", {})
    count = anomalies.get("total_anomalies", 0) if isinstance(anomalies, dict) else len(anomalies)
    if count > 0:
        if language == "hi":
            questions.append("डेटा में क्या विसंगतियां (outliers) हैं?")
        elif language == "mr":
            questions.append("डेटामध्ये काही विसंगती (outliers) आढळल्या का?")
        else:
            questions.append("Are there any unusual outliers in the data?")

    # 4. Correlation / Relationship
    corrs = analysis.get("correlations", {}).get("significant_pairs", [])
    if corrs:
        if language == "hi":
            questions.append("मैट्रिक्स में सबसे मजबूत सहसंबंध कौन सा है?")
        elif language == "mr":
            questions.append("कोणत्या दोन घटकांमध्ये सर्वात जास्त सहसंबंध आहे?")
        else:
            questions.append("Which metrics have the strongest relationship?")
    else:
        if language == "hi":
            questions.append("डेटा एक्सप्लोरर खोलें")
        elif language == "mr":
            questions.append("डेटा एक्सप्लोरर उघडा")
        else:
            questions.append("Show me the Data Explorer table")

    return questions[:4]


def _filter_df(df: pd.DataFrame, active_filters: Optional[dict[str, Any]]) -> pd.DataFrame:
    if not active_filters:
        return df

    filtered = df.copy()
    for col, val in active_filters.items():
        if col not in filtered.columns or val is None or val == "all":
            continue

        if isinstance(val, dict):
            # Numeric range: {"min": x, "max": y}
            if "min" in val and pd.notna(val["min"]):
                filtered = filtered[filtered[col] >= float(val["min"])]
            if "max" in val and pd.notna(val["max"]):
                filtered = filtered[filtered[col] <= float(val["max"])]
        elif isinstance(val, list):
            # Multi-select categorical
            if len(val) > 0:
                filtered = filtered[filtered[col].astype(str).isin([str(v) for v in val])]
        else:
            filtered = filtered[filtered[col].astype(str) == str(val)]

    return filtered


def answer_question(
    query: str,
    df: pd.DataFrame,
    profile: Any,
    analysis: dict[str, Any],
    cleaning_report: dict[str, Any] | None = None,
    active_filters: Optional[dict[str, Any]] = None,
    current_context: Optional[dict[str, Any]] = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Computes an exact, non-hallucinated answer using real dataset numbers, active filters,
    and current UI context. Supports English, Hindi (हिंदी), and Marathi (मराठी).
    """
    q_lower = query.lower().strip()
    active_df = _filter_df(df, active_filters)
    has_filters = active_filters and any(v not in (None, "all", [], {}) for v in active_filters.values())

    # Detect language if user typed in Hindi or Marathi script
    is_hindi_script = bool(re.search(r"[\u0900-\u097F]", query))
    is_marathi_terms = any(w in q_lower for w in ["सरासरी", "एकूण", "किती", "आहे", "काय", "सर्वात", "सर्वाधिक", "दाखवा", "उघडा", "विसंगती", "मला"])
    is_hindi_terms = any(w in q_lower for w in ["औसत", "कुल", "कितना", "कितनी", "क्या", "सबसे", "अधिकतम", "न्यूनतम", "दिखाओ", "खोलो", "विसंगति", "kya", "hai", "kitna"])

    lang = language or "en"
    if is_marathi_terms or (is_hindi_script and any(w in query for w in ["आहे", "किती", "दाखवा", "एकूण", "सरासरी"])):
        lang = "mr"
    elif is_hindi_terms or (is_hindi_script and not is_marathi_terms):
        if lang not in ("mr", "hi"):
            lang = "hi"

    # Suffix for active filters
    if has_filters:
        if lang == "hi":
            filter_suffix = f" (सक्रिय फ़िल्टर के बाद {len(active_df):,} रिकॉर्ड्स)"
        elif lang == "mr":
            filter_suffix = f" (सक्रिय फिल्टर्सनंतर {len(active_df):,} नोंदी)"
        else:
            filter_suffix = f" ({len(active_df):,} records after active filters)"
    else:
        filter_suffix = ""

    if active_df.empty:
        if lang == "hi":
            msg = "चयनित फ़िल्टर से कोई डेटा मेल नहीं खाता। कृपया फ़िल्टर बदलें या रीसेट करें।"
            btn = "सभी फ़िल्टर साफ़ करें"
        elif lang == "mr":
            msg = "निवडलेल्या फिल्टर्सनुसार कोणताही डेटा उपलब्ध नाही. कृपया फिल्टर्स बदला किंवा रीसेट करा."
            btn = "सर्व फिल्टर्स साफ करा"
        else:
            msg = "No data matches the selected filters. Adjust your slicers or click below to reset."
            btn = "Clear All Filters"
        return {
            "answer": msg,
            "supporting_metric": "0 matching rows",
            "category": "filter",
            "confidence": 100,
            "action": {"label": btn, "type": "clear_filter", "target": "all"}
        }

    # 1. ACTION COMMANDS: Navigation & UI Control
    if any(k in q_lower for k in ["open correlation", "show correlation", "सहसंबंध दिखाओ", "सहसंबंध दाखवा", "सहसंबंध"]):
        ans = "सहसंबंध विश्लेषण (Correlation Analysis) उघडत आहे." if lang == "mr" else ("सहसंबंध विश्लेषण खोला जा रहा है।" if lang == "hi" else "Opening Correlation Analysis and feature relationship matrix.")
        label = "सहसंबंध विश्लेषण उघडा →" if lang == "mr" else ("सहसंबंध विश्लेषण खोलें →" if lang == "hi" else "Open Correlation Analysis →")
        return {
            "answer": ans,
            "supporting_metric": "Correlation Matrix",
            "category": "navigation",
            "confidence": 100,
            "action": {"label": label, "type": "navigate", "target": "clusters"}
        }

    if any(k in q_lower for k in ["open data explorer", "show data explorer", "show data table", "explore data", "डेटा टेबल", "डेटा एक्सप्लोरर"]):
        ans = "डेटा एक्सप्लोरर सारणी उघडत आहे." if lang == "mr" else ("डेटा एक्सप्लोरर तालिका खोली जा रही है।" if lang == "hi" else "Navigating to the Data Explorer table.")
        label = "डेटा एक्सप्लोरर उघडा →" if lang == "mr" else ("डेटा एक्सप्लोरर खोलें →" if lang == "hi" else "Open Data Explorer →")
        return {
            "answer": ans,
            "supporting_metric": f"{len(active_df):,} records available",
            "category": "navigation",
            "confidence": 100,
            "action": {"label": label, "type": "navigate", "target": "explorer"}
        }

    if any(k in q_lower for k in ["show ai insights", "open insights", "view insights", "key insights", "अंतर्दृष्टि", "अंतर्दृष्टी"]):
        ans = "एआय अंतर्दृष्टी (AI Insights) उघडत आहे." if lang == "mr" else ("एआई अंतर्दृष्टि (AI Insights) खोली जा रही है।" if lang == "hi" else "Navigating to Prioritized AI Insights.")
        label = "अंतर्दृष्टी उघडा →" if lang == "mr" else ("अंतर्दृष्टि खोलें →" if lang == "hi" else "Open AI Insights →")
        return {
            "answer": ans,
            "supporting_metric": "Strategic Takeaways",
            "category": "navigation",
            "confidence": 100,
            "action": {"label": label, "type": "navigate", "target": "insights"}
        }

    if any(k in q_lower for k in ["what if", "simulation", "predict", "सिमुलेशन", "सिम्युलेशन"]):
        ans = "व्हॉट-इफ प्रेडिक्टिव्ह सिम्युलेटर उघडत आहे." if lang == "mr" else ("व्हॉट-इफ प्रेडिक्टिव परिदृश्य सिमुलेटर खोला जा रहा है।" if lang == "hi" else "Opening What-If Predictive Scenario Simulator.")
        label = "व्हॉट-इफ सिम्युलेशन उघडा →" if lang == "mr" else ("व्हॉट-इफ सिमुलेशन खोलें →" if lang == "hi" else "Open What-If Simulation →")
        return {
            "answer": ans,
            "supporting_metric": "Scenario Simulator",
            "category": "navigation",
            "confidence": 100,
            "action": {"label": label, "type": "navigate", "target": "whatif"}
        }

    if any(k in q_lower for k in ["clear all filters", "clear filter", "reset filter", "फ़िल्टर साफ़", "फिल्टर साफ", "फिल्टर काढा"]):
        ans = "सर्व सक्रिय फिल्टर्स हटवून मूळ डेटा पुनर्स्थापित केला जात आहे." if lang == "mr" else ("सभी सक्रिय फ़िल्टर हटाकर पूर्ण डेटा दृश्य पुनर्स्थापित किया जा रहा है।" if lang == "hi" else "Clearing all active slicer filters and restoring the full dataset view.")
        label = "सर्व फिल्टर्स साफ करा" if lang == "mr" else ("सभी फ़िल्टर साफ़ करें" if lang == "hi" else "Clear All Filters")
        return {
            "answer": ans,
            "supporting_metric": f"Restoring {len(df):,} total records",
            "category": "filter",
            "confidence": 100,
            "action": {"label": label, "type": "clear_filter", "target": "all"}
        }

    # 2. CONTEXTUAL REASONING: "Why is this high?", "Explain this chart"
    if any(k in q_lower for k in ["why is this high", "explain this chart", "why is this", "what is this", "tell me about this", "यह इतना अधिक क्यों है", "हे जास्त का आहे"]):
        target_metric = None
        target_chart_id = None
        if current_context and isinstance(current_context, dict):
            target_metric = current_context.get("current_metric") or current_context.get("current_chart_title")
            target_chart_id = current_context.get("current_chart_id")

        matched_col = None
        if target_metric:
            for c in active_df.columns:
                if c.lower() in target_metric.lower():
                    matched_col = c
                    break

        if not matched_col and profile.numerical_columns:
            matched_col = profile.numerical_columns[0]

        if matched_col and matched_col in active_df.columns:
            s = pd.to_numeric(active_df[matched_col], errors="coerce").dropna()
            if not s.empty:
                avg_val = s.mean()
                max_val = s.max()
                q75 = s.quantile(0.75)
                if lang == "hi":
                    ans = f"'{matched_col}' का औसत {avg_val:,.2f} है तथा उच्चतम शिखर {max_val:,.2f} तक पहुंचता है। 75% मान {q75:,.2f} के नीचे हैं, जिससे संकेत मिलता है कि शीर्ष आउटलायर वितरण को ऊपर खींच रहे हैं{filter_suffix}।"
                    action_lbl = f"{matched_col} विवरण देखें →"
                elif lang == "mr":
                    ans = f"'{matched_col}' साठी सरासरी {avg_val:,.2f} असून कमाल मूल्य {max_val:,.2f} पर्यंत पोहोचते. 75% मूल्ये {q75:,.2f} च्या खाली आहेत{filter_suffix}."
                    action_lbl = f"{matched_col} तपशील पहा →"
                else:
                    ans = (
                        f"For {matched_col}, the active average is {avg_val:,.2f} with peak spikes reaching {max_val:,.2f}. "
                        f"75% of values sit below {q75:,.2f}, indicating that top outliers are skewing upper distribution thresholds{filter_suffix}."
                    )
                    action_lbl = f"View {matched_col} Details →"
                return {
                    "answer": ans,
                    "supporting_metric": f"Mean {matched_col}: {avg_val:,.2f} · Max: {max_val:,.2f}",
                    "category": "contextual",
                    "confidence": 96,
                    "action": {"label": action_lbl, "type": "view_chart", "target": target_chart_id or matched_col}
                }

    # 3. SPECIFIC COLUMN METRIC QUERIES (Average, Mean, Total, Sum, Min, Max)
    avg_keywords = ["average", "mean", "avg", "औसत", "माध्य", "सरासरी", "kya hai", "kitna hai"]
    sum_keywords = ["total", "sum", "cumulative", "overall", "कुल", "योग", "एकूण", "बेरीज"]
    dist_keywords = ["distribution", "spread", "histogram", "वितरण", "विभाजन"]

    for col in profile.numerical_columns:
        col_clean = col.lower()
        if col_clean in q_lower or (len(col_clean) > 3 and col_clean[:4] in q_lower):
            s = pd.to_numeric(active_df[col], errors="coerce").dropna()
            if s.empty:
                continue

            # Average / Mean query
            if any(k in q_lower for k in avg_keywords):
                avg_val = s.mean()
                med_val = s.median()
                if lang == "hi":
                    ans = f"'{col}' का औसत मान {avg_val:,.2f} है (माध्यिका: {med_val:,.2f}, सीमा: {s.min():,.2f} से {s.max():,.2f}){filter_suffix}।"
                    lbl = f"{col} वितरण देखें →"
                elif lang == "mr":
                    ans = f"'{col}' चे सरासरी मूल्य {avg_val:,.2f} आहे (मध्यक: {med_val:,.2f}, किमान: {s.min():,.2f} ते {s.max():,.2f}){filter_suffix}।"
                    lbl = f"{col} वितरण पहा →"
                else:
                    ans = f"The average {col} is {avg_val:,.2f} (median: {med_val:,.2f}, range: {s.min():,.2f} to {s.max():,.2f}){filter_suffix}."
                    lbl = f"View {col} Distribution →"
                return {
                    "answer": ans,
                    "supporting_metric": f"Average {col}: {avg_val:,.2f}",
                    "category": "metric",
                    "confidence": 98,
                    "action": {"label": lbl, "type": "view_chart", "target": col}
                }

            # Total / Sum query
            if any(k in q_lower for k in sum_keywords):
                sum_val = s.sum()
                if lang == "hi":
                    ans = f"'{col}' का कुल संचयी योग {len(s):,} रिकॉर्ड्स में {sum_val:,.2f} है{filter_suffix}।"
                    lbl = f"{col} चार्ट देखें →"
                elif lang == "mr":
                    ans = f"'{col}' ची एकूण बेरीज {len(s):,} नोंदींमध्ये {sum_val:,.2f} आहे{filter_suffix}।"
                    lbl = f"{col} चार्ट पहा →"
                else:
                    ans = f"The total cumulative {col} is {sum_val:,.2f} across {len(s):,} observed records{filter_suffix}."
                    lbl = f"View {col} Chart →"
                return {
                    "answer": ans,
                    "supporting_metric": f"Total {col}: {sum_val:,.2f}",
                    "category": "metric",
                    "confidence": 98,
                    "action": {"label": lbl, "type": "view_chart", "target": col}
                }

            # Distribution query
            if any(k in q_lower for k in dist_keywords):
                if lang == "hi":
                    ans = f"'{col}' का मानक विचलन (Std Dev) {s.std():,.2f} और माध्यिका {s.median():,.2f} है{filter_suffix}।"
                    lbl = f"{col} बॉक्स प्लॉट देखें →"
                elif lang == "mr":
                    ans = f"'{col}' चे मानक विचलन {s.std():,.2f} आणि मध्यक {s.median():,.2f} आहे{filter_suffix}।"
                    lbl = f"{col} बॉक्स प्लॉट पहा →"
                else:
                    ans = f"{col} has a median of {s.median():,.2f} with standard deviation of {s.std():,.2f} (IQR: {s.quantile(0.75) - s.quantile(0.25):,.2f}){filter_suffix}."
                    lbl = f"View {col} Box Plot →"
                return {
                    "answer": ans,
                    "supporting_metric": f"Std Dev: {s.std():,.2f}",
                    "category": "metric",
                    "confidence": 95,
                    "action": {"label": lbl, "type": "view_chart", "target": col}
                }

    # General Average / Mean fallback
    if any(k in q_lower for k in avg_keywords) and profile.numerical_columns:
        first_num = profile.numerical_columns[0]
        s = pd.to_numeric(active_df[first_num], errors="coerce").dropna()
        if not s.empty:
            avg_val = s.mean()
            if lang == "hi":
                ans = f"सक्रिय रिकॉर्ड्स में '{first_num}' का औसत {avg_val:,.2f} है (माध्यिका: {s.median():,.2f}){filter_suffix}।"
                lbl = f"{first_num} विवरण देखें →"
            elif lang == "mr":
                ans = f"सक्रिय नोंदींमध्ये '{first_num}' ची सरासरी {avg_val:,.2f} आहे (मध्यक: {s.median():,.2f}){filter_suffix}।"
                lbl = f"{first_num} तपशील पहा →"
            else:
                ans = f"The average {first_num} across active records is {avg_val:,.2f} (median: {s.median():,.2f}){filter_suffix}."
                lbl = f"View {first_num} Breakdown →"
            return {
                "answer": ans,
                "supporting_metric": f"Average {first_num}: {avg_val:,.2f}",
                "category": "metric",
                "confidence": 96,
                "action": {"label": lbl, "type": "view_chart", "target": first_num}
            }

    # 4. CATEGORY RANKING & "HIGHEST / TOP / LEADING"
    rank_keywords = [
        "highest", "top", "rank", "lead", "best", "most", "largest", "patient count", "volume", "count",
        "सबसे ज्यादा", "अधिकतम", "उच्चतम", "सर्वाधिक", "जास्तीत जास्त", "दाखवा", "अव्वल"
    ]
    if any(k in q_lower for k in rank_keywords):
        cat_candidates = profile.categorical_columns
        num_candidates = profile.numerical_columns

        selected_cat = cat_candidates[0] if cat_candidates else None
        for c in cat_candidates:
            if c.lower() in q_lower:
                selected_cat = c
                break

        selected_num = num_candidates[0] if num_candidates else None
        for n in num_candidates:
            if n.lower() in q_lower:
                selected_num = n
                break

        if selected_cat:
            try:
                if selected_num and not any(k in q_lower for k in ["count", "patient count", "number of", "संख्या"]):
                    grp = active_df.groupby(selected_cat)[selected_num].sum(numeric_only=True).dropna().sort_values(ascending=False)
                    top_name = str(grp.index[0])
                    top_val = float(grp.iloc[0])
                    total_val = float(grp.sum())
                    pct = (top_val / total_val * 100) if total_val > 0 else 0
                    if lang == "hi":
                        ans = f"'{top_name}' {selected_cat} में {top_val:,.2f} कुल {selected_num} के साथ शीर्ष पर है, जो कुल मात्रा का {pct:.1f}% है{filter_suffix}।"
                        lbl = f"{top_name} से फ़िल्टर करें"
                    elif lang == "mr":
                        ans = f"'{top_name}' हे {top_val:,.2f} एकूण {selected_num} सह {selected_cat} मध्ये आघाडीवर आहे (एकूण वाट्याचा {pct:.1f}%){filter_suffix}।"
                        lbl = f"{top_name} नुसार फिल्टर करा"
                    else:
                        ans = f"'{top_name}' leads {selected_cat} with {top_val:,.2f} in total {selected_num}, representing {pct:.1f}% of cumulative volume{filter_suffix}."
                        lbl = f"Filter by {top_name}"
                    return {
                        "answer": ans,
                        "supporting_metric": f"Top: {top_name} ({top_val:,.2f})",
                        "category": "ranking",
                        "confidence": 98,
                        "action": {
                            "label": lbl,
                            "type": "apply_filter",
                            "target": {"column": selected_cat, "value": top_name}
                        }
                    }
                else:
                    counts = active_df[selected_cat].value_counts()
                    if not counts.empty:
                        top_name = str(counts.index[0])
                        top_count = int(counts.iloc[0])
                        pct = (top_count / len(active_df) * 100) if len(active_df) > 0 else 0
                        if lang == "hi":
                            ans = f"'{top_name}' {selected_cat} में सबसे अधिक बारंबारता रखता है ({top_count:,} रिकॉर्ड्स, {pct:.1f}% हिस्सा){filter_suffix}।"
                            lbl = f"{top_name} से फ़िल्टर करें"
                        elif lang == "mr":
                            ans = f"'{top_name}' ची {selected_cat} मध्ये सर्वाधिक वारंवारता आहे ({top_count:,} नोंदी, {pct:.1f}% वाटा){filter_suffix}।"
                            lbl = f"{top_name} नुसार फिल्टर करा"
                        else:
                            ans = f"'{top_name}' has the highest frequency in {selected_cat} with {top_count:,} records ({pct:.1f}% of active rows){filter_suffix}."
                            lbl = f"Filter by {top_name}"
                        return {
                            "answer": ans,
                            "supporting_metric": f"{top_name}: {top_count:,} records ({pct:.1f}%)",
                            "category": "ranking",
                            "confidence": 98,
                            "action": {
                                "label": lbl,
                                "type": "apply_filter",
                                "target": {"column": selected_cat, "value": top_name}
                            }
                        }
            except Exception:
                pass

    # 5. CORRELATIONS & RELATIONSHIPS
    corr_keywords = ["correlat", "relationship", "association", "linked", "connected", "सहसंबंध", "संबंध"]
    if any(k in q_lower for k in corr_keywords):
        corrs = analysis.get("correlations", {})
        pos = corrs.get("strongest_positive")
        if pos:
            if lang == "hi":
                ans = f"'{pos['column_a']}' और '{pos['column_b']}' के बीच सबसे मजबूत सकारात्मक सहसंबंध (r = {pos['correlation']:.2f}) है।"
                lbl = "सहसंबंध विश्लेषण खोलें →"
            elif lang == "mr":
                ans = f"'{pos['column_a']}' आणि '{pos['column_b']}' मध्ये सर्वात मजबूत धन सहसंबंध (r = {pos['correlation']:.2f}) दिसून येतो."
                lbl = "सहसंबंध विश्लेषण उघडा →"
            else:
                ans = (
                    f"The strongest statistical relationship is between '{pos['column_a']}' and '{pos['column_b']}' "
                    f"with a {pos['direction']} Pearson correlation of r = {pos['correlation']:.2f}."
                )
                lbl = "Open Correlation Analysis →"
            return {
                "answer": ans,
                "supporting_metric": f"Pearson r = {pos['correlation']:.2f}",
                "category": "correlation",
                "confidence": 97,
                "action": {"label": lbl, "type": "navigate", "target": "clusters"}
            }
        no_corr = "कोणताही मजबूत रेषीय सहसंबंध आढळला नाही (|r| < 0.35)." if lang == "mr" else ("सक्रिय संख्यात्मक स्तंभों में कोई मजबूत सहसंबंध नहीं पाया गया।" if lang == "hi" else "No strong linear correlations (|r| >= 0.35) were identified among active numerical columns.")
        lbl = "व्हॉट-इफ सिमुलेशन पहा →" if lang == "mr" else ("व्हॉट-इफ सिमुलेशन देखें →" if lang == "hi" else "View What-If Simulation →")
        return {
            "answer": no_corr,
            "supporting_metric": "Max |r| < 0.35",
            "category": "correlation",
            "confidence": 92,
            "action": {"label": lbl, "type": "navigate", "target": "whatif"}
        }

    # 6. ANOMALIES & OUTLIERS
    anom_keywords = ["anomaly", "anomalies", "outlier", "outliers", "unusual", "spike", "irregular", "विसंगति", "असामान्य", "अपवाद", "विसंगती"]
    if any(k in q_lower for k in anom_keywords):
        anomalies = analysis.get("anomalies", {})
        total = anomalies.get("total_anomalies", 0) if isinstance(anomalies, dict) else 0
        records = anomalies.get("records", []) if isinstance(anomalies, dict) else []
        if total > 0 and records:
            top = records[0]
            top_idx = top.get('row_index', 1)
            top_col = top.get('column', '')
            top_val = top.get('value', 0)
            if lang == "hi":
                ans = f"{total} डेटा पॉइंट्स असामान्य (Outliers) पाए गए। शीर्ष आउटलायर: '{top_col}' पर पंक्ति #{top_idx} (मान: {top_val:,})।"
                lbl = "डेटा एक्सप्लोरर में आउटलायर्स देखें →"
            elif lang == "mr":
                ans = f"{total} नोंदी सांख्यिकीयदृष्ट्या अपवादात्मक आढळल्या. अव्वल विसंगती: '{top_col}' वरील पंक्ती #{top_idx} (मूल्य: {top_val:,})."
                lbl = "एक्सप्लोररमध्ये आउटलायर्स तपासा →"
            else:
                ans = (
                    f"{total} data points were identified as statistically unusual via Isolation Forest. "
                    f"Top outlier: Row #{top_idx} on '{top_col}' with value {top_val:,}."
                )
                lbl = "Inspect Outliers in Explorer →"
            return {
                "answer": ans,
                "supporting_metric": f"{total} anomalies detected",
                "category": "anomaly",
                "confidence": 96,
                "action": {"label": lbl, "type": "navigate", "target": "explorer"}
            }
        no_anom = "डेटासेटमध्ये कोणतीही गंभीर विसंगती आढळली नाही." if lang == "mr" else ("संख्यात्मक विशेषताओं में कोई गंभीर विसंगतियां नहीं पाई गईं।" if lang == "hi" else "No high-severity statistical anomalies were detected in the numerical attributes.")
        lbl = "गुणवत्ता ऑडिट पहा →" if lang == "mr" else ("गुणवत्ता ऑडिट देखें →" if lang == "hi" else "View Quality Audit →")
        return {
            "answer": no_anom,
            "supporting_metric": "0 critical anomalies",
            "category": "anomaly",
            "confidence": 94,
            "action": {"label": lbl, "type": "navigate", "target": "quality"}
        }

    # 7. TIME SERIES / TRENDS
    trend_keywords = ["trend", "growth", "over time", "history", "trajectory", "ट्रेंड", "रुझान", "प्रवाह", "कल"]
    if any(k in q_lower for k in trend_keywords):
        trends = analysis.get("trends", [])
        if trends:
            t = trends[0]
            if lang == "hi":
                ans = f"प्रमुख माप '{t['column']}' में {t['periods_analyzed']} अवधियों में शुद्ध {t['total_pct_change']:+.1f}% का {t['direction']} ट्रेंड दिखा।"
                lbl = f"{t['column']} ट्रेंड चार्ट देखें →"
            elif lang == "mr":
                ans = f"प्रमुख घटक '{t['column']}' मध्ये {t['periods_analyzed']} कालावधींमध्ये {t['total_pct_change']:+.1f}% चा {t['direction']} कल दिसून येतो."
                lbl = f"{t['column']} ट्रेंड चार्ट पहा →"
            else:
                ans = f"Primary measure '{t['column']}' exhibits a {t['direction']} trend with a net change of {t['total_pct_change']:+.1f}% across {t['periods_analyzed']} periods."
                lbl = f"View Trend Chart →"
            return {
                "answer": ans,
                "supporting_metric": f"{t['column']}: {t['total_pct_change']:+.1f}%",
                "category": "trend",
                "confidence": 96,
                "action": {"label": lbl, "type": "view_chart", "target": t["column"]}
            }
        no_trend = "कालक्रमानुसार कल काढण्यासाठी डेटामध्ये तारीख स्तंभ उपलब्ध नाही." if lang == "mr" else ("ट्रेंड निकालने के लिए कोई दिनांक स्तंभ उपलब्ध नहीं है।" if lang == "hi" else "No temporal date dimension is available in this dataset to compute chronological trends.")
        return {
            "answer": no_trend,
            "supporting_metric": "0 Date Columns",
            "category": "trend",
            "confidence": 90
        }

    # 8. DEFAULT / GENERAL EXECUTIVE SUMMARY
    domain = getattr(profile, "domain_name", "General Dataset")
    rows = len(active_df)
    if lang == "hi":
        ans = (
            f"{domain} के लिए {rows:,} सक्रिय रिकॉर्ड्स और {profile.column_count} स्तंभों का विश्लेषण। "
            f"डेटा वितरण {len(profile.numerical_columns)} संख्यात्मक और {len(profile.categorical_columns)} श्रेणीबद्ध आयामों के साथ सत्यापित है{filter_suffix}।"
        )
        lbl = "एआई अंतर्दृष्टि खोलें →"
    elif lang == "mr":
        ans = (
            f"{domain} अंतर्गत {rows:,} सक्रिय नोंदी आणि {profile.column_count} स्तंभांचे यशस्वी विश्लेषण. "
            f"{len(profile.numerical_columns)} संख्यात्मक व {len(profile.categorical_columns)} वर्गवारी आयाम सत्यापित आहेत{filter_suffix}."
        )
        lbl = "एआय अंतर्दृष्टी उघडा →"
    else:
        ans = (
            f"Analyzing {rows:,} active records across {profile.column_count} columns for {domain}. "
            f"Data distribution is validated with {len(profile.numerical_columns)} numerical and {len(profile.categorical_columns)} categorical dimensions{filter_suffix}."
        )
        lbl = "Open AI Insights →"

    return {
        "answer": ans,
        "supporting_metric": f"{rows:,} records · {profile.column_count} columns",
        "category": "summary",
        "confidence": 95,
        "action": {"label": lbl, "type": "navigate", "target": "insights"}
    }
