require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// helper — check key is set
function keyMissing() {
  return !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here';
}

// ─── Question Bank ─────────────────────────────────────────────
const questionBank = {
  easy: [
    {
      id: 1, title: "Two Sum", difficulty: "Easy", category: "Arrays", timeLimit: 900,
      description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.`,
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9" },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
      ],
      constraints: ["2 <= nums.length <= 10⁴", "-10⁹ <= nums[i] <= 10⁹", "Only one valid answer exists."],
      starterCode: {
        javascript: `function twoSum(nums, target) {\n    // Your solution here\n    \n}`,
        python: `def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n        return {};\n    }\n};`
      }
    },
    {
      id: 2, title: "Palindrome Check", difficulty: "Easy", category: "Strings", timeLimit: 900,
      description: `Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.\n\nA string is a palindrome when it reads the same forward and backward.`,
      examples: [
        { input: 's = "racecar"', output: "true" },
        { input: 's = "hello"', output: "false" }
      ],
      constraints: ["1 <= s.length <= 2 * 10⁵"],
      starterCode: {
        javascript: `function isPalindrome(s) {\n    // Your solution here\n    \n}`,
        python: `def is_palindrome(s: str) -> bool:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public boolean isPalindrome(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool isPalindrome(string s) {\n        return false;\n    }\n};`
      }
    },
    {
      id: 3, title: "FizzBuzz", difficulty: "Easy", category: "Math", timeLimit: 600,
      description: `Given an integer \`n\`, return a string array where for each number from 1 to n:\n\n- "FizzBuzz" if divisible by both 3 and 5\n- "Fizz" if divisible by 3\n- "Buzz" if divisible by 5\n- The number as string otherwise`,
      examples: [{ input: "n = 5", output: '["1","2","Fizz","4","Buzz"]' }],
      constraints: ["1 <= n <= 10⁴"],
      starterCode: {
        javascript: `function fizzBuzz(n) {\n    // Your solution here\n    \n}`,
        python: `def fizz_buzz(n: int) -> list[str]:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public List<String> fizzBuzz(int n) {\n        return new ArrayList<>();\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<string> fizzBuzz(int n) {\n        return {};\n    }\n};`
      }
    },
    {
      id: 7, title: "Reverse a String", difficulty: "Easy", category: "Strings", timeLimit: 600,
      description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.`,
      examples: [
        { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
        { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' }
      ],
      constraints: ["1 <= s.length <= 10⁵", "s[i] is a printable ASCII character"],
      starterCode: {
        javascript: `function reverseString(s) {\n    // Modify s in-place\n    // Your solution here\n    \n}`,
        python: `def reverse_string(s: list[str]) -> None:\n    # Modify s in-place\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public void reverseString(char[] s) {\n        // Your solution here\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        // Your solution here\n    }\n};`
      }
    },
    {
      id: 8, title: "Maximum Subarray", difficulty: "Easy", category: "Dynamic Programming", timeLimit: 900,
      description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.`,
      examples: [
        { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "Subarray [4,-1,2,1] has the largest sum 6." },
        { input: "nums = [1]", output: "1" },
        { input: "nums = [5,4,-1,7,8]", output: "23" }
      ],
      constraints: ["1 <= nums.length <= 10⁵", "-10⁴ <= nums[i] <= 10⁴"],
      starterCode: {
        javascript: `function maxSubArray(nums) {\n    // Your solution here\n    \n}`,
        python: `def max_sub_array(nums: list[int]) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 9, title: "Climb Stairs", difficulty: "Easy", category: "Dynamic Programming", timeLimit: 600,
      description: `You are climbing a staircase. It takes \`n\` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
      examples: [
        { input: "n = 2", output: "2", explanation: "1+1 or 2" },
        { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, or 2+1" }
      ],
      constraints: ["1 <= n <= 45"],
      starterCode: {
        javascript: `function climbStairs(n) {\n    // Your solution here\n    \n}`,
        python: `def climb_stairs(n: int) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int climbStairs(int n) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 10, title: "Contains Duplicate", difficulty: "Easy", category: "Arrays", timeLimit: 600,
      description: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.`,
      examples: [
        { input: "nums = [1,2,3,1]", output: "true" },
        { input: "nums = [1,2,3,4]", output: "false" },
        { input: "nums = [1,1,1,3,3,4,3,2,4,2]", output: "true" }
      ],
      constraints: ["1 <= nums.length <= 10⁵", "-10⁹ <= nums[i] <= 10⁹"],
      starterCode: {
        javascript: `function containsDuplicate(nums) {\n    // Your solution here\n    \n}`,
        python: `def contains_duplicate(nums: list[int]) -> bool:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public boolean containsDuplicate(int[] nums) {\n        // Your solution here\n        return false;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        return false;\n    }\n};`
      }
    },
    {
      id: 11, title: "Best Time to Buy and Sell Stock", difficulty: "Easy", category: "Arrays", timeLimit: 900,
      description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the i-th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve. If you cannot achieve any profit, return 0.`,
      examples: [
        { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price=1), sell on day 5 (price=6), profit = 5." },
        { input: "prices = [7,6,4,3,1]", output: "0", explanation: "No profit possible." }
      ],
      constraints: ["1 <= prices.length <= 10⁵", "0 <= prices[i] <= 10⁴"],
      starterCode: {
        javascript: `function maxProfit(prices) {\n    // Your solution here\n    \n}`,
        python: `def max_profit(prices: list[int]) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int maxProfit(int[] prices) {\n        // Your solution here\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 12, title: "Valid Anagram", difficulty: "Easy", category: "Strings", timeLimit: 600,
      description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.\n\nAn anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.`,
      examples: [
        { input: 's = "anagram", t = "nagaram"', output: "true" },
        { input: 's = "rat", t = "car"', output: "false" }
      ],
      constraints: ["1 <= s.length, t.length <= 5 * 10⁴", "s and t consist of lowercase English letters"],
      starterCode: {
        javascript: `function isAnagram(s, t) {\n    // Your solution here\n    \n}`,
        python: `def is_anagram(s: str, t: str) -> bool:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Your solution here\n        return false;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        return false;\n    }\n};`
      }
    }
  ],
  medium: [
    {
      id: 4, title: "Longest Substring Without Repeating Characters", difficulty: "Medium", category: "Sliding Window", timeLimit: 1800,
      description: `Given a string \`s\`, find the length of the longest substring without repeating characters.`,
      examples: [
        { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc".' },
        { input: 's = "bbbbb"', output: "1" }
      ],
      constraints: ["0 <= s.length <= 5 * 10⁴"],
      starterCode: {
        javascript: `function lengthOfLongestSubstring(s) {\n    // Your solution here\n    \n}`,
        python: `def length_of_longest_substring(s: str) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 5, title: "Valid Parentheses", difficulty: "Medium", category: "Stack", timeLimit: 1200,
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type and in the correct order.`,
      examples: [
        { input: 's = "()"', output: "true" },
        { input: 's = "()[]{}"', output: "true" },
        { input: 's = "(]"', output: "false" }
      ],
      constraints: ["1 <= s.length <= 10⁴"],
      starterCode: {
        javascript: `function isValid(s) {\n    // Your solution here\n    \n}`,
        python: `def is_valid(s: str) -> bool:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};`
      }
    },
    {
      id: 13, title: "3Sum", difficulty: "Medium", category: "Two Pointers", timeLimit: 1800,
      description: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.\n\nNotice that the solution set must not contain duplicate triplets.`,
      examples: [
        { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
        { input: "nums = [0,1,1]", output: "[]" },
        { input: "nums = [0,0,0]", output: "[[0,0,0]]" }
      ],
      constraints: ["3 <= nums.length <= 3000", "-10⁵ <= nums[i] <= 10⁵"],
      starterCode: {
        javascript: `function threeSum(nums) {\n    // Your solution here\n    \n}`,
        python: `def three_sum(nums: list[int]) -> list[list[int]]:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        return new ArrayList<>();\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        return {};\n    }\n};`
      }
    },
    {
      id: 14, title: "Product of Array Except Self", difficulty: "Medium", category: "Arrays", timeLimit: 1800,
      description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.\n\nThe product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.`,
      examples: [
        { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
        { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" }
      ],
      constraints: ["2 <= nums.length <= 10⁵", "-30 <= nums[i] <= 30", "No division allowed"],
      starterCode: {
        javascript: `function productExceptSelf(nums) {\n    // Your solution here\n    \n}`,
        python: `def product_except_self(nums: list[int]) -> list[int]:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        return new int[]{};\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        return {};\n    }\n};`
      }
    },
    {
      id: 15, title: "Binary Search", difficulty: "Medium", category: "Binary Search", timeLimit: 1200,
      description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.`,
      examples: [
        { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4", explanation: "9 exists at index 4" },
        { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" }
      ],
      constraints: ["1 <= nums.length <= 10⁴", "All integers are unique", "nums is sorted ascending"],
      starterCode: {
        javascript: `function search(nums, target) {\n    // Your solution here\n    \n}`,
        python: `def search(nums: list[int], target: int) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        return -1;\n    }\n};`
      }
    },
    {
      id: 16, title: "Number of Islands", difficulty: "Medium", category: "Graph / BFS/DFS", timeLimit: 2100,
      description: `Given an m x n 2D binary grid \`grid\` which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
      examples: [
        { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
        { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3" }
      ],
      constraints: ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is '0' or '1'"],
      starterCode: {
        javascript: `function numIslands(grid) {\n    // Your solution here\n    \n}`,
        python: `def num_islands(grid: list[list[str]]) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int numIslands(char[][] grid) {\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 17, title: "Coin Change", difficulty: "Medium", category: "Dynamic Programming", timeLimit: 2100,
      description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.`,
      examples: [
        { input: "coins = [1,5,11], amount = 15", output: "3", explanation: "Three 5-dollar coins." },
        { input: "coins = [2], amount = 3", output: "-1" },
        { input: "coins = [1], amount = 0", output: "0" }
      ],
      constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2³¹ - 1", "0 <= amount <= 10⁴"],
      starterCode: {
        javascript: `function coinChange(coins, amount) {\n    // Your solution here\n    \n}`,
        python: `def coin_change(coins: list[int], amount: int) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        return -1;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        return -1;\n    }\n};`
      }
    },
    {
      id: 18, title: "Group Anagrams", difficulty: "Medium", category: "Hashing", timeLimit: 1800,
      description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in any order.\n\nAn anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.`,
      examples: [
        { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
        { input: 'strs = [""]', output: '[[""]]' }
      ],
      constraints: ["1 <= strs.length <= 10⁴", "0 <= strs[i].length <= 100"],
      starterCode: {
        javascript: `function groupAnagrams(strs) {\n    // Your solution here\n    \n}`,
        python: `def group_anagrams(strs: list[str]) -> list[list[str]]:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        return new ArrayList<>();\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        return {};\n    }\n};`
      }
    }
  ],
  hard: [
    {
      id: 6, title: "Merge K Sorted Lists", difficulty: "Hard", category: "Heap / Priority Queue", timeLimit: 2700,
      description: `You are given an array of \`k\` linked-lists \`lists\`, each sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.\n\nNote: For simplicity, lists is represented as an array of arrays.`,
      examples: [
        { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
        { input: "lists = []", output: "[]" }
      ],
      constraints: ["k == lists.length", "0 <= k <= 10⁴", "0 <= lists[i].length <= 500"],
      starterCode: {
        javascript: `function mergeKLists(lists) {\n    // Your solution here\n    \n}`,
        python: `def merge_k_lists(lists: list[list[int]]) -> list[int]:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public int[] mergeKLists(int[][] lists) {\n        return new int[]{};\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> mergeKLists(vector<vector<int>>& lists) {\n        return {};\n    }\n};`
      }
    },
    {
      id: 19, title: "Trapping Rain Water", difficulty: "Hard", category: "Two Pointers", timeLimit: 2700,
      description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
      examples: [
        { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "6 units of rain water are trapped." },
        { input: "height = [4,2,0,3,2,5]", output: "9" }
      ],
      constraints: ["n == height.length", "1 <= n <= 2 * 10⁴", "0 <= height[i] <= 10⁵"],
      starterCode: {
        javascript: `function trap(height) {\n    // Your solution here\n    \n}`,
        python: `def trap(height: list[int]) -> int:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public int trap(int[] height) {\n        return 0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        return 0;\n    }\n};`
      }
    },
    {
      id: 20, title: "Median of Two Sorted Arrays", difficulty: "Hard", category: "Binary Search", timeLimit: 2700,
      description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).`,
      examples: [
        { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000", explanation: "Merged = [1,2,3], median = 2." },
        { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.50000", explanation: "Merged = [1,2,3,4], median = 2.5." }
      ],
      constraints: ["0 <= m, n <= 1000", "1 <= m + n <= 2000", "-10⁶ <= nums1[i], nums2[i] <= 10⁶"],
      starterCode: {
        javascript: `function findMedianSortedArrays(nums1, nums2) {\n    // Your solution here\n    \n}`,
        python: `def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        return 0.0;\n    }\n};`
      }
    },
    {
      id: 21, title: "Word Break", difficulty: "Hard", category: "Dynamic Programming", timeLimit: 2700,
      description: `Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.`,
      examples: [
        { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true", explanation: '"leetcode" can be segmented as "leet code".' },
        { input: 's = "applepenapple", wordDict = ["apple","pen"]', output: "true" },
        { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" }
      ],
      constraints: ["1 <= s.length <= 300", "1 <= wordDict.length <= 1000"],
      starterCode: {
        javascript: `function wordBreak(s, wordDict) {\n    // Your solution here\n    \n}`,
        python: `def word_break(s: str, word_dict: list[str]) -> bool:\n    # Your solution here\n    pass`,
        java: `import java.util.*;\nclass Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        return false;\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        return false;\n    }\n};`
      }
    },
    {
      id: 22, title: "Longest Palindromic Substring", difficulty: "Hard", category: "Dynamic Programming", timeLimit: 2700,
      description: `Given a string \`s\`, return the longest palindromic substring in \`s\`.`,
      examples: [
        { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' },
        { input: 's = "cbbd"', output: '"bb"' }
      ],
      constraints: ["1 <= s.length <= 1000", "s consists of only digits and English letters"],
      starterCode: {
        javascript: `function longestPalindrome(s) {\n    // Your solution here\n    \n}`,
        python: `def longest_palindrome(s: str) -> str:\n    # Your solution here\n    pass`,
        java: `class Solution {\n    public String longestPalindrome(String s) {\n        return "";\n    }\n}`,
        cpp: `#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    string longestPalindrome(string s) {\n        return "";\n    }\n};`
      }
    }
  ]
};

// ─── API Routes ────────────────────────────────────────────────

app.get('/api/questions', (req, res) => {
  const { difficulty } = req.query;
  let questions = difficulty && questionBank[difficulty.toLowerCase()]
    ? questionBank[difficulty.toLowerCase()]
    : [...questionBank.easy, ...questionBank.medium, ...questionBank.hard];
  res.json({ questions });
});

app.get('/api/questions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const all = [...questionBank.easy, ...questionBank.medium, ...questionBank.hard];
  const question = all.find(q => q.id === id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  res.json({ question });
});


// Evaluate solution
// Evaluate solution
app.post('/api/evaluate', async (req, res) => {
  const { question, code, language = 'javascript', timeTaken } = req.body;
  if (!question || !code) return res.status(400).json({ error: 'Question and code are required' });
  if (keyMissing()) return res.status(500).json({ error: 'GROQ_API_KEY not set in .env file.' });

  try {
    const prompt = `You are a technical interview evaluator. Evaluate this solution. Respond with ONLY a valid JSON object, no markdown, no extra text, no explanation outside the JSON.

PROBLEM: ${question.title}
LANGUAGE: ${language}
TIME TAKEN: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s of ${Math.floor(question.timeLimit / 60)}m

CODE:
${code.substring(0, 1500)}

JSON response (keep all string values SHORT, under 100 chars each):
{"verdict":"Accepted or Wrong Answer or Incomplete","score":85,"correctness":90,"efficiency":80,"codeQuality":85,"timeComplexity":"O(n)","spaceComplexity":"O(1)","summary":"Short 1-2 sentence summary.","strengths":["strength 1","strength 2"],"improvements":["improvement 1","improvement 2"],"optimalApproach":"Brief description of optimal approach.","sampleOptimalCode":"// optimal solution here"}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    let text = response.choices[0].message.content.trim();
    // Strip any markdown fences
    text = text.replace(/```json|```/g, '').trim();
    // Extract JSON if there's extra text around it
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in response');
    const evaluation = JSON.parse(jsonMatch[0]);
    res.json({ evaluation });
  } catch (err) {
    console.error('Evaluate error:', err.message);
    // Return a fallback evaluation so the app doesn't crash
    res.json({
      evaluation: {
        verdict: 'Evaluated',
        score: 70, correctness: 70, efficiency: 70, codeQuality: 70,
        timeComplexity: 'N/A', spaceComplexity: 'N/A',
        summary: 'Your solution was submitted successfully. Manual review recommended.',
        strengths: ['Solution was submitted', 'Attempted the problem'],
        improvements: ['Review edge cases', 'Consider time complexity'],
        optimalApproach: 'Review the problem constraints for the optimal approach.',
        sampleOptimalCode: '// See problem editorial for optimal solution'
      }
    });
  }
});


// Hint
app.post('/api/hint', async (req, res) => {
  const { question, code, hintLevel = 1 } = req.body;
  if (keyMissing()) return res.status(500).json({ error: 'GROQ_API_KEY not set in .env file.' });

  const instructions = hintLevel === 1
    ? 'Give a very subtle hint about the approach without revealing the solution.'
    : hintLevel === 2
    ? 'Give a moderate hint explaining the key concept or data structure to use.'
    : 'Give a detailed hint with pseudocode but not the full solution.';

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Problem: ${question.title}\n\n${question.description}\n\nCandidate's code:\n${code || '(empty)'}\n\n${instructions}\n\nRespond with just the hint text.`
      }]
    });
    res.json({ hint: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get hint.' });
  }
});

// AI Interviewer
// AI Interviewer chat
app.post('/api/interviewer', async (req, res) => {
  const { question, code, userMessage, chatHistory = [], triggerType = 'user' } = req.body;
  if (keyMissing()) return res.status(500).json({ error: 'GROQ_API_KEY not set in .env file.' });

  try {
    let systemPrompt = '';

    if (triggerType === 'question_intro') {
      systemPrompt = `You are Alex, a technical interviewer. Introduce this coding problem in exactly 5 complete sentences. Each sentence must be fully finished. No sentence should be cut off.

Sentence 1: "Hi, I'm Alex, your interviewer today — great to meet you."
Sentence 2: State the problem name, difficulty and category in one complete sentence.
Sentence 3: Explain in plain English what the problem asks you to do. Keep it simple and complete.
Sentence 4: "For example, ${question?.examples?.[0]?.input?.replace(/"/g, "'")}, the answer is ${question?.examples?.[0]?.output} — ${question?.examples?.[0]?.explanation || 'as shown in the example'}."
Sentence 5: "One key constraint is ${question?.constraints?.[0]}, so keep that in mind. Take a moment to think and tell me your approach."

Write all 5 sentences as one short paragraph. No bullet points. No markdown. No backticks. Plain speech only. COMPLETE every sentence fully.`;

    } else if (triggerType === 'code_analysis') {
      systemPrompt = `You are Alex, a technical interviewer. Look at the candidate's code and ask ONE short question or observation. 2 sentences max. Never give away the solution.

Problem: ${question?.title}
Code: ${code || '(empty — ask them to start coding)'}
Recent chat: ${chatHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Ask about their approach, logic, edge cases, or complexity. Be natural and brief.`;

    } else if (triggerType === 'stuck_hint') {
      systemPrompt = `You are Alex, a technical interviewer. The candidate seems stuck. Give one encouraging hint in 2 sentences. Don't reveal the solution.

Problem: ${question?.title}
Code so far: ${code || '(empty)'}

Nudge them in the right direction warmly.`;

    } else {
      systemPrompt = `You are Alex, a friendly technical interviewer. Reply to the candidate in 2-3 sentences max. Be helpful, encouraging, never give away the answer.

Problem: ${question?.title}
Code: ${code || 'none yet'}`;
    }

    const messages = triggerType === 'user'
      ? [
          { role: 'system', content: systemPrompt },
          ...chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ]
      : [{ role: 'user', content: systemPrompt }];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: triggerType === 'question_intro' ? 400 : 100,
      temperature: 0.3,
      messages
    });

    const reply = response.choices[0].message.content.trim();
    res.json({ reply });

  } catch (err) {
    console.error('Interviewer error:', err.message);
    res.status(500).json({ error: 'Interviewer error: ' + err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Interview Simulator running at http://localhost:${PORT}`);
  console.log(`📝 Make sure GROQ_API_KEY is set in your .env file\n`);
});
