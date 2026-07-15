/**
 * Injects a small JS bridge into a quiz HTML page before it is served inside
 * an iframe.  The bridge exposes `window.submitScore(score)` which the quiz
 * HTML can call once grading is complete.  It fires a postMessage to the
 * parent Nukhba shell, which then POSTs the score to `/api/v4/quiz-scores`.
 *
 * The message shape is:
 *   { type: 'NUKHBA_QUIZ_SCORE', quizId: <number>, quizType: <string>, score: <0-100> }
 */
export function injectQuizBridge(
  html: string,
  quizId: number,
  quizType: "unit" | "level" | "stage",
): string {
  const script = `\n<script>
(function(){
  var _qId   = ${quizId};
  var _qType = '${quizType}';
  /**
   * Call this from inside the quiz HTML once the student finishes.
   * score — integer 0-100 (fractions are rounded).
   */
  window.submitScore = function(score) {
    var s = Math.round(parseFloat(String(score)));
    if (isNaN(s) || s < 0 || s > 100) { return; }
    try {
      window.parent.postMessage(
        { type: 'NUKHBA_QUIZ_SCORE', quizId: _qId, quizType: _qType, score: s },
        '*'
      );
    } catch(e) {}
  };
})();
</script>\n`;

  // Prefer injecting before </body> so the script is available during DOMContentLoaded
  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  // Fallback: append at end
  return html + script;
}
