"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, X, Send, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Available models
const AVAILABLE_MODELS = [
  "microsoft/phi-4-reasoning-plus:free",
  "microsoft/phi-4-reasoning:free",
  "qwen/qwen3-0.6b-04-28:free",
  "qwen/qwen3-1.7b:free",
  "qwen/qwen3-4b:free",
  "opengvlab/internvl3-14b:free",
  "deepseek/deepseek-prover-v2:free",
  "qwen/qwen3-30b-a3b:free",
  "qwen/qwen3-8b:free",
  "qwen/qwen3-14b:free",
  "qwen/qwen3-32b:free",
  "qwen/qwen3-235b-a22b:free",
  "microsoft/mai-ds-r1:free",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "deepseek/deepseek-chat-v3-0324:free"
]


interface Message {
  role: "user" | "assistant"
  content: string
}

interface ModelChat {
  id: string
  name: string
  messages: Message[]
  isLoading: boolean
}

export default function MultiModelChat() {
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [modelChats, setModelChats] = useState<ModelChat[]>([])
  const [input, setInput] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with default models
  useEffect(() => {
    if (modelChats.length === 0 && selectedModels.length === 0) {
      const initialModels = ["microsoft/phi-4-reasoning:free"]
      setSelectedModels(initialModels)
      setModelChats(
        initialModels.map((model) => ({
          id: crypto.randomUUID(),
          name: model,
          messages: [],
          isLoading: false,
        })),
      )
    }
  }, [modelChats.length, selectedModels.length])

  // Update model chats when selected models change
  useEffect(() => {
    // Remove chats for unselected models
    setModelChats((prev) => prev.filter((chat) => selectedModels.includes(chat.name)))

    // Add chats for newly selected models
    const newModels = selectedModels.filter((model) => !modelChats.some((chat) => chat.name === model))

    if (newModels.length > 0) {
      setModelChats((prev) => [
        ...prev,
        ...newModels.map((model) => ({
          id: crypto.randomUUID(),
          name: model,
          messages: [],
          isLoading: false,
        })),
      ])
    }
  }, [selectedModels])

  const handleModelSelect = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m) => m !== model)
      } else {
        return [...prev, model]
      }
    })
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Add user message to all chats
    const userMessage: Message = { role: "user", content: input }
    setModelChats((prev) =>
      prev.map((chat) => ({
        ...chat,
        messages: [...chat.messages, userMessage],
        isLoading: true,
      })),
    )

    // Clear input
    setInput("")

    // Send requests to each model in parallel
    const requests = modelChats.map(async (chat) => {
      try {
        const response = await fetch("http://127.0.0.1:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            MODAL: chat.name,
            content: input,
          }),
        })

        if (!response.ok) throw new Error("Failed to get response")

        const data = await response.json()
        return {
          modelName: chat.name,
          response: data.response || "No response received",
        }
      } catch (error) {
        console.error(`Error with model ${chat.name}:`, error)
        return {
          modelName: chat.name,
          response: "Error: Failed to get response from model",
        }
      }
    })

    // Update chats with responses
    const responses = await Promise.all(requests)
    setModelChats((prev) =>
      prev.map((chat) => {
        const modelResponse = responses.find((r) => r.modelName === chat.name)
        if (modelResponse) {
          return {
            ...chat,
            messages: [...chat.messages, { role: "assistant", content: modelResponse.response }],
            isLoading: false,
          }
        }
        return chat
      }),
    )
  }

  // Calculate grid columns based on number of selected models
  const getGridColumns = () => {
    const count = modelChats.length
    if (count <= 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 md:grid-cols-2"
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(-90deg,#02203c,#001528)" }}>
      <header className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Multi-Model Chat Explorer</h1>

        <div className="flex items-center gap-2">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-white">
                Select Models <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-white">
              {AVAILABLE_MODELS.map((model) => (
                <DropdownMenuItem key={model} className="flex items-center gap-2">
                  <Checkbox
                    id={`model-${model}`}
                    checked={selectedModels.includes(model)}
                    onCheckedChange={() => handleModelSelect(model)}
                  />
                  <label htmlFor={`model-${model}`} className="flex-1 cursor-pointer">
                    {model}
                  </label>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-hidden">
        <div className={`grid ${getGridColumns()} gap-4 h-full`}>
          {modelChats.map((chat) => (
            <div
              key={chat.id}
              className="flex flex-col bg-slate-800 rounded-lg overflow-hidden border border-slate-700 h-[calc(100vh-12rem)]"
            >
              <div className="p-3 bg-slate-700 flex justify-between items-center">
                <h3 className="font-medium text-white">
                  <Badge variant="outline" className="mr-2">
                    Model
                  </Badge>
                  {chat.name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleModelSelect(chat.name)}
                  className="h-8 w-8 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {chat.messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <p>No messages yet. Start typing below!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chat.messages.map((message, i) => (
                      <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-white"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {chat.isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-slate-700 text-white">
                          <div className="flex space-x-2">
                            <div
                              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
            </div>
          ))}

          {modelChats.length === 0 && (
            <div className="col-span-full flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
              <div className="text-center">
                <Plus className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-white">No models selected</h3>
                <p className="mt-1 text-sm text-slate-400">Select models from the dropdown above to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-slate-800 border-slate-700 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || modelChats.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
