document.addEventListener('DOMContentLoaded', Setup);


//variables
var groups;

function Setup()
{
	Subscribe();
	OpenSuitibleScreen();
}

function OpenSuitibleScreen()
{
	chrome.storage.local.get(['access_token', 'group_list', 'group_id', 'group_name', "group_numeric_id", 'total_comments', 'total_posts', 'new_comments'], function(result) 
	{
		document.getElementById("cleat_all").style.display = 'none';
		document.getElementById("clear_all_button").style.display = 'block';
		if (result.access_token === undefined)
		{
			ShowLogin();
		}
		else
		{
			if (result.group_list === undefined)
			{
				ShowGroupsLoading();
			}
			else
			{
				if (result.group_id === undefined)
				{
					ShowSetup(result.group_list);
				}
				else
				{
					ShowComments(result.group_id, result.group_name, result.group_numeric_id, result.total_posts, result.total_comments, result.new_comments);
				}
			}
		}
	});
}

		
function OnLogicButtonClick() 
{
	var vkCLientId = '6602088',
	vkAuthenticationUrl = 'https://oauth.vk.com/authorize?client_id=' + vkCLientId + '&scope=offline&redirect_uri=http%3A%2F%2Foauth.vk.com%2Fblank.html&display=page&response_type=token';
	console.log('vkAuthenticationUrl is ' + vkAuthenticationUrl);
	chrome.tabs.create({url: vkAuthenticationUrl, active: true});
}

function OnGroupSelectButtonClick()
{
	var selectedGroup = groups[document.getElementById("group_select").selectedIndex];
	var screenName = selectedGroup.screen_name;
	var name = selectedGroup.name;
	var groupNumericId = selectedGroup.id;
	chrome.storage.local.set({'group_id': screenName, 'group_name': name, 'group_numeric_id' : groupNumericId}, function ()
	{
		OpenSuitibleScreen();   
	});
}

function OnClearButtonClick() 
{
	document.getElementById("cleat_all").style.display = 'block';
	document.getElementById("clear_all_button").style.display = 'none';
	document.getElementById("login").style.display = 'none';
	document.getElementById("group_loading").style.display = 'none';
	document.getElementById("setup").style.display = 'none';
	document.getElementById("comments").style.display = 'none';
}

function Subscribe()
{
	var button = document.getElementById("login_button");
	button.addEventListener("click", OnLogicButtonClick);

	button = document.getElementById("group_select_button");
	button.addEventListener("click", OnGroupSelectButtonClick);

	button = document.getElementById("clear_all_button");
	button.addEventListener("click", OnClearButtonClick);

	var no = document.getElementById("no_clear_button");
	var yes = document.getElementById("yes_clear_button");

	no.addEventListener("click", function() 
	{
		OpenSuitibleScreen();
	});
	yes.addEventListener("click", function() 
	{
		groups = undefined;

		chrome.storage.local.clear(function() 
		{
			var error = chrome.runtime.lastError;
			if (error) {
				alert("Чистка прошла с ошибкой!");
			}
			else
			{
				alert("Чистка прошла успешно!");
			}
			OpenSuitibleScreen();
		});
	});

}

function ShowGroupsLoading()
{
	document.getElementById("login").style.display = 'none';
	document.getElementById("group_loading").style.display = 'block';
	document.getElementById("setup").style.display = 'none';
	document.getElementById("comments").style.display = 'none';
}

function ShowSetup(text)
{
	document.getElementById("login").style.display = 'none';
	document.getElementById("group_loading").style.display = 'none';
	document.getElementById("setup").style.display = 'block';
	document.getElementById("comments").style.display = 'none';

	var select = document.getElementById("group_select");

	var json = JSON.parse(text);

	groups = json["response"]["items"];
	groups.forEach(function(item, i, arr) 
	{
		var newOption = new Option(item.name, item.name, true, true)
		select.appendChild(newOption);
	});
}

function ShowLogin()
{
	document.getElementById("clear_all_button").style.display = 'none';
	document.getElementById("login").style.display = 'block';
	document.getElementById("group_loading").style.display = 'none';
	document.getElementById("setup").style.display = 'none';
	document.getElementById("comments").style.display = 'none';
}

function ShowComments(groupId, groupName, groupNumericId, postCount, commentsCount, newComments)
{
	document.getElementById("login").style.display = 'none';
	document.getElementById("group_loading").style.display = 'none';
	document.getElementById("setup").style.display = 'none';
	document.getElementById("comments").style.display = 'block';

	var nameDiv = document.getElementById('group_name');
	var text = "Трекаем группу: <a href=\"http://vk.com/" + groupId + "\" target=\"_blank\">" + groupName + "</a>";
	nameDiv.innerHTML = text;

	var gettingsData = document.getElementById('getting_data');
	var postCountDiv = document.getElementById('total_posts');
	var countComments = document.getElementById('total_comments');
	var noNewComments = document.getElementById('no_new_comments');
	var commentsHolder = document.getElementById('new_comments');

	if (postCount === undefined)
	{
		gettingsData.style.display = 'block';
		postCountDiv.style.display = 'none';
		countComments.style.display = 'none';
		noNewComments.style.display = 'none';
		setTimeout(OpenSuitibleScreen, 1000);
		return;
	}
	gettingsData.style.display = 'none';
	postCountDiv.style.display = 'block';
	countComments.style.display = 'block';

	text = "Всего постов: " + postCount;
	postCountDiv.innerHTML = text;

	text = "Всего комментариев: " + commentsCount;
	countComments.innerHTML = text;

	if (Object.keys(newComments).length.length == 0)
	{
		commentsHolder.style.display = 'none';
		noNewComments.style.display = 'block';
	}
	else
	{
		noNewComments.style.display = 'none';
		commentsHolder.style.display = 'block';
		commentsHolder.innerHTML = "";

		for(var key in newComments)
		{
			let item = newComments[key];
			let commentText = "<div class=\"comment\">" +
				"<p>Новых комментариев: " + item.count + "</p>" + 
				"<p>К посту:</p>" +
				"<div class=\"post_text\">" + item.text + "</div>" +
				"<p><button id=\"open_button" + item.id + "\">Открыть!</button><button id=\"checked_button" + item.id + "\" class=\"button button_blue\">Проверено!</button></p>" +
				"</div>";

			commentsHolder.innerHTML += commentText;
		}
		for(let key in newComments)
		{
			let item = newComments[key];
			let button_open = document.getElementById("open_button" + item.id);
			button_open.addEventListener("click", function() 
			{
				chrome.tabs.create({url: "http://vk.com/" + groupId + "?w=wall-" + groupNumericId + "_" + item.id, active: true});
			});
			let button_checked = document.getElementById("checked_button" + item.id);
			button_checked.addEventListener("click", function() 
			{
				delete newComments[key];
				chrome.storage.local.set({'new_comments': newComments}, function ()
					{
						OpenSuitibleScreen();
					});
			});
		}
	}
}