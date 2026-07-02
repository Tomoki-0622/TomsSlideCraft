export default function HowToTab() {
  const steps = [
    {
      number: "1",
      icon: "📝",
      tab: "ストーリー作成",
      description:
        "AIと壁打ちしながらプレゼンのストーリーを考えてくれます。その内容をマークダウン形式としてファイル保存することが可能です。",
    },
    {
      number: "2",
      icon: "🖼️",
      tab: "スライド資料の作成",
      description:
        "1で作成したマークダウンの内容からプレゼン用スライド（HTML）を作成します。作成後、HTMLファイル、またはPPTXとしてファイルは保存できます。",
    },
    {
      number: "3",
      icon: "🌐",
      tab: "スライド資料の英語化",
      description:
        "日本語となっている資料を英語に翻訳してくれます。",
    },
    {
      number: "4",
      icon: "📜",
      tab: "スクリプト作成",
      description:
        "マークダウンファイルおよびHTMLスライドの内容から日本語版のスクリプト作成、また英語版のスクリプトの作成を支援します。",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#F5F5F5] p-8 overflow-y-auto">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🎨</div>
          <h1 className="text-2xl font-bold text-[#333333] mb-2">
            Tom&apos;s SlideCraft へようこそ
          </h1>
          <p className="text-gray-500 text-sm">
            AIを使ってプレゼン資料をワンストップで作成できるツールです。
            <br />
            上部のタブを左から順に使うことで、スムーズに資料を仕上げられます。
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex gap-4 items-start"
            >
              {/* Number badge */}
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#54C3E1] text-white flex items-center justify-center font-bold text-sm">
                {step.number}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{step.icon}</span>
                  <span className="font-semibold text-[#333333]">
                    {step.tab}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow (not last) */}
              {i < steps.length - 1 && (
                <div className="hidden" />
              )}
            </div>
          ))}
        </div>

        {/* Flow arrow */}
        <div className="flex flex-col items-center gap-1 my-2 text-gray-300 text-xs select-none">
          <div className="flex items-center gap-3 text-gray-400 text-sm font-medium mt-6">
            <span className="h-px flex-1 bg-gray-200" />
            <span>上記の順番で進めましょう</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>💡 ヒント:</strong> 本ツールで入力した内容はAIに送信されます。社内情報取り扱いルールに従ってご利用ください。
        </div>
      </div>
    </div>
  );
}
