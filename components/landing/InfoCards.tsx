import { Mic, Clock, Smile } from "lucide-react"

export function InfoCards() {
  const infoData = [
    {
      icon: <Mic className="h-6 w-6 text-blue-600" />,
      title: "Voice-Based",
      description: "Just speak naturally, no typing needed",
      bgColor: "bg-blue-50"
    },
    {
      icon: <Clock className="h-6 w-6 text-amber-500" />,
      title: "~8 Minutes",
      description: "Quick and focused conversation",
      bgColor: "bg-amber-50"
    },
    {
      icon: <Smile className="h-6 w-6 text-green-500" />,
      title: "Friendly",
      description: "Relaxed, conversational experience",
      bgColor: "bg-green-50"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full max-w-4xl mx-auto">
      {infoData.map((item, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className={`p-3 rounded-full ${item.bgColor}`}>
            {item.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{item.title}</h4>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
