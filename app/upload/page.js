'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload as UploadIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

export default function UploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'claude-skill',
    price: '0',
    creator: '',
    github_url: '',
    source_url: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        alert('Skill uploaded successfully!')
        router.push('/')
      } else {
        alert('Error uploading skill')
      }
    } catch (e) {
      console.error('Error:', e)
      alert('Error uploading skill')
    }
    
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Upload Your Skill</h1>
          <p className="text-gray-300">Share your AI skill with the community</p>
        </div>

        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Skill Details</CardTitle>
            <CardDescription className="text-gray-400">
              Fill in the information about your skill. <Link href="/help" className="text-purple-400 underline">Need help?</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-blue-400 font-semibold mb-2">💡 What is a "Skill"?</h3>
                <p className="text-gray-300 text-sm">
                  A skill is a specific capability you want AI to have. Examples: "Write cold emails", "Analyze data", "Generate code". 
                  You can create skills from your own prompts or workflows!
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Skill Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="Example: Email Marketing Assistant"
                />
                <p className="text-gray-500 text-sm">Give it a clear, descriptive name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                  placeholder="Example: Helps create engaging email campaigns with subject lines, body copy, and call-to-actions that convert"
                />
                <p className="text-gray-500 text-sm">Explain what this skill does in 1-2 sentences</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-skill">Claude Skill</SelectItem>
                      <SelectItem value="gemini-extension">Gemini Extension</SelectItem>
                      <SelectItem value="mcp-server">MCP Server</SelectItem>
                      <SelectItem value="prompt">AI Prompt</SelectItem>
                      <SelectItem value="ai-agent">AI Agent</SelectItem>
                      <SelectItem value="ai-tool">AI Tool</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-gray-500 text-sm">Pick the closest match</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-white">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="0 for free"
                  />
                  <p className="text-gray-500 text-sm">Leave as 0 to make it free</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creator" className="text-white">Your Name (Optional)</Label>
                <Input
                  id="creator"
                  value={formData.creator}
                  onChange={(e) => handleChange('creator', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="Your name or organization"
                />
                <p className="text-gray-500 text-sm">So others know who created this skill</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github_url" className="text-white">GitHub URL (Optional)</Label>
                <Input
                  id="github_url"
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => handleChange('github_url', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="https://github.com/username/repo"
                />
                <p className="text-gray-500 text-sm">Link to code repository if you have one</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_url" className="text-white">Source URL (Optional)</Label>
                <Input
                  id="source_url"
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => handleChange('source_url', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="https://your-website.com/skill-info"
                />
                <p className="text-gray-500 text-sm">Link to documentation or your website</p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-2">✅ Ready to Upload?</h3>
                <p className="text-gray-300 text-sm">
                  Once you upload, your skill will be available for others to use in their AI agents!
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {loading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload Skill
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
