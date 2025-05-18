(pretend there's a question mark at the end of all of these)

#### todo

##### eventually :tm:
- Import song lists?
	- Could I do this with a spotify link (album or playlist)? that would be cool.
- elapsed time column in decision history

##### maybe someday
- back/undo button
	- was not easily possible with previous implementation, idk about now that i use async/await
- skip button
	- only within a recusion level? idk how this affects the algorithm

- restart button mid sort
	- lazy implementation to take you to the list selection interface is very simple, but I don't see how it's much better than just refreshing the page
	- otherwise probably have to store shuffle seed
		- theres no immediate way to do math.random with seeds in js apparently so im just going to ignore this for now

##### probably never
- tie buttons
	- yuck!
- Use Atkinson Hyperlegible instead of Arial
	- https://fonts.google.com/specimen/Atkinson+Hyperlegible
	- I don't like the way it looks ._.
- Show decision history during sorting 
	- copy button makes this redundant